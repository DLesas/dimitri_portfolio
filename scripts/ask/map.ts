/**
 * The data behind the embeddings post's figures (src/components/blog/embeddings), from the
 * site being deployed: every chunk's vector flattened from 4,096 dimensions to 3, by PCA
 * and by UMAP, a few passages' numbers side by side, a few preset questions with where they
 * land and what the site's search ranks for them, and the facts the post's text quotes.
 * Writes src/components/blog/embeddings/map.json.
 *
 * Production builds run it before Next builds the pages (npm's prebuild, after sync.ts has
 * embedded every chunk), so the post always shows the site as deployed; if it can't, the
 * build fails, as the sync's does. Other builds and the dev server keep the committed
 * map.json, which `npm run ask:map` refreshes, signed in to AWS as for Pulumi.
 *
 * The preset questions' vectors are kept too (mapQuestions.json), so a build only calls
 * OpenRouter for a question that's new or changed. Run it with the build key after changing
 * one, and commit what it saves:
 *
 *   OPENROUTER_BUILD_KEY=… npm run ask:map
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { ScanCommand, type AttributeValue } from "@aws-sdk/client-dynamodb";
import { embedMany } from "ai";
import seedrandom from "seedrandom";
import { UMAP } from "umap-js";
import { ASK_CHUNKS_TABLE } from "../../infra/names";
import { EMBEDDING_MODEL, QUERY_INSTRUCTION, SEARCH_CANDIDATES } from "@/lib/ask/config";
import { DEPLOYED_CHUNKS } from "@/lib/ask/deployedChunks";
import { fuseRankings, keywordIndex, keywordSearch } from "@/lib/ask/keyword";
import { embeddingModel } from "@/lib/ask/models";
import { chunkStore } from "@/lib/ask/store";
import { embeddingCost } from "@/lib/ask/sync";

const QUESTIONS = [
  "What did Dimitri work on at Roke?",
  "Which databases has he used?",
  "Has he led a team?",
  "How does the home page stay fast on a phone?",
  "What does the site cost to run?",
  "Does he know Drizzle?",
];
/**
 * Where the preset questions' vectors are kept, each under a fingerprint of what made it
 * (the model, the instruction and the question), so changing any of those embeds it afresh
 */
const SAVED_QUESTIONS = "scripts/ask/mapQuestions.json";
type SavedQuestions = Record<string, { question: string; vector: string }>;
const fingerprint = (question: string) =>
  createHash("sha256").update(`${EMBEDDING_MODEL}\n${QUERY_INSTRUCTION}${question}`).digest("hex").slice(0, 16);
/** A vector as 32-bit floats in base64: under half the size of its numbers written out */
const packed = (vector: number[]) => {
  const bytes = Buffer.alloc(vector.length * 4);
  vector.forEach((v, i) => bytes.writeFloatLE(v, i * 4));
  return bytes.toString("base64");
};
const unpacked = (text: string) => {
  const bytes = Buffer.from(text, "base64");
  return Array.from({ length: bytes.length / 4 }, (_, i) => bytes.readFloatLE(i * 4));
};
/** Neighbours counted when measuring how much of the real layout a flattening keeps */
const NEIGHBOURS = 5;
/** Passages listed per ranking for each question */
const RANKED = 8;
type Kind = "role" | "skill" | "intro" | "post";
/**
 * The passages the "numbers" figure compares, by their last heading: two roles, a skill
 * and a blog section. One that's gone is replaced by the first other passage of its kind.
 */
const COMPARED: { label: string; kind: Kind }[] = [
  { label: "Machine Learning Engineer, Roke", kind: "role" },
  { label: "Senior Full Stack Engineer & Data Scientist, Capita", kind: "role" },
  { label: "Drizzle", kind: "skill" },
  { label: "Physics at a fixed 60 Hz", kind: "post" },
];
/** How many numbers it shows for each: those that vary most between the site's passages */
const SHOWN_NUMBERS = 48;

const fromBuild = process.argv.includes("--production-only");
if (fromBuild && process.env.VERCEL_ENV !== "production") {
  console.log("Site assistant: not a production build, so the embeddings post keeps its committed data");
  process.exit(0);
}

try {
  process.env.ASK_CHUNKS_TABLE ??= ASK_CHUNKS_TABLE;
  process.env.AWS_REGION ??= "eu-west-2";
  const store = chunkStore();
  if (!store) throw new Error("it needs ASK_CHUNKS_TABLE (infra/ask.ts)");

  // This build's chunks (scripts/ask/chunks.ts), with their vectors from the table. Read
  // consistently: the sync has only just written the new ones, and a scan by default might
  // not see them yet
  const vectors = new Map<string, number[]>();
  let start: Record<string, AttributeValue> | undefined;
  do {
    const page = await store.dynamo.send(new ScanCommand({ TableName: store.table, ExclusiveStartKey: start, ConsistentRead: true }));
    for (const item of page.Items ?? []) vectors.set(item.id.S ?? "", (item.vector.L ?? []).map((n) => Number(n.N)));
    start = page.LastEvaluatedKey;
  } while (start);
  const chunks = DEPLOYED_CHUNKS.filter((c) => vectors.has(c.id));
  if (chunks.length < DEPLOYED_CHUNKS.length) throw new Error(`${DEPLOYED_CHUNKS.length - chunks.length} of this build's chunks have no vector yet: run the sync first`);
  const X = chunks.map((c) => vectors.get(c.id)!);
  const n = X.length;

  // The preset questions' vectors: as saved, embedding only those that are new or changed
  const saved: SavedQuestions = existsSync(SAVED_QUESTIONS) ? JSON.parse(readFileSync(SAVED_QUESTIONS, "utf8")) : {};
  const keys = QUESTIONS.map(fingerprint);
  const unsaved = QUESTIONS.filter((_, q) => !saved[keys[q]]);
  if (unsaved.length) {
    const apiKey = process.env.OPENROUTER_BUILD_KEY;
    if (!apiKey) throw new Error(`it needs OPENROUTER_BUILD_KEY (infra/ask.ts) to embed ${unsaved.length} new or changed preset questions`);
    const { embeddings } = await embedMany({ model: embeddingModel(apiKey), values: unsaved.map((q) => QUERY_INSTRUCTION + q), maxRetries: 5 });
    unsaved.forEach((question, i) => (saved[fingerprint(question)] = { question, vector: packed(embeddings[i]) }));
    if (fromBuild)
      console.warn(`Site assistant: this build embedded ${unsaved.length} new or changed preset questions for the embeddings post: run npm run ask:map and commit ${SAVED_QUESTIONS}, so builds don't have to`);
  }
  // Read back from what's saved, so a question comes out the same whether embedded now or before
  const asked = keys.map((key) => unpacked(saved[key].vector));

  const dot = (a: number[], b: number[]) => a.reduce((sum, x, i) => sum + x * b[i], 0);
  const length = (a: number[]) => Math.sqrt(dot(a, a));
  const cosine = (a: number[], b: number[]) => dot(a, b) / length(a) / length(b);

  // PCA, through the n × n Gram matrix (n is far smaller than 4,096), by power iteration
  const mean = X[0].map((_, j) => X.reduce((sum, x) => sum + x[j], 0) / n);
  const centred = (x: number[]) => x.map((v, j) => v - mean[j]);
  const C = X.map(centred);
  let gram = C.map((a) => C.map((b) => dot(a, b)));
  const total = gram.reduce((sum, row, i) => sum + row[i], 0);
  const axes: number[][] = [];
  const variance: number[] = [];
  for (let k = 0; k < 3; k++) {
    let v = C.map((_, i) => Math.sin(i + k + 1));
    for (let i = 0; i < 1000; i++) {
      const w = gram.map((row) => dot(row, v));
      const size = length(w);
      v = w.map((x) => x / size);
    }
    const eigen = dot(v, gram.map((row) => dot(row, v)));
    variance.push(eigen / total);
    // The direction in the 4,096 dimensions, to place anything along it
    axes.push(mean.map((_, j) => C.reduce((sum, c, i) => sum + c[j] * v[i], 0) / Math.sqrt(eigen)));
    gram = gram.map((row, i) => row.map((x, j) => x - eigen * v[i] * v[j]));
  }
  const pca = (x: number[]) => axes.map((axis) => dot(centred(x), axis));

  // UMAP by cosine distance, seeded so the same site comes out the same each time
  const umap = new UMAP({ nComponents: 3, nNeighbors: NEIGHBOURS, minDist: 0.3, distanceFn: (a, b) => 1 - cosine(a, b), random: seedrandom("lesas.dev") });
  const umapPoints = umap.fit(X);
  const umapAsked = umap.transform(asked);

  /** `points` (and `others`, placed with them) moved and scaled so the points fill -1 to 1 */
  const fitted = (points: number[][], others: number[][]) => {
    const centre = [0, 1, 2].map((k) => (Math.min(...points.map((p) => p[k])) + Math.max(...points.map((p) => p[k]))) / 2);
    const reach = Math.max(...points.flatMap((p) => p.map((v, k) => Math.abs(v - centre[k]))));
    const fit = (p: number[]) => p.map((v, k) => Math.round(((v - centre[k]) / reach) * 1000) / 1000);
    return [points.map(fit), others.map(fit)];
  };
  const [pcaFit, pcaAskedFit] = fitted(X.map(pca), asked.map(pca));
  const [umapFit, umapAskedFit] = fitted(umapPoints, umapAsked);

  /** The share of each chunk's nearest neighbours (by cosine, in full) still nearest in a flattening */
  const kept = (flat: number[][]) => {
    const nearest = (score: (i: number, j: number) => number) =>
      X.map((_, i) => X.map((_, j) => j).filter((j) => j !== i).sort((a, b) => score(i, b) - score(i, a)).slice(0, NEIGHBOURS));
    const real = nearest((i, j) => cosine(X[i], X[j]));
    const shown = nearest((i, j) => -length(flat[i].map((v, k) => v - flat[j][k])));
    return real.reduce((sum, list, i) => sum + list.filter((j) => shown[i].includes(j)).length, 0) / (n * NEIGHBOURS);
  };

  const kindOf = (path: string[]): Kind =>
    path[1] === "Work experience" ? "role" : path[1] === "Skills" ? "skill" : path[0] === "About" || path[0] === "Home" ? "intro" : "post";
  const index = new Map(chunks.map((c, i) => [c.id, i]));
  const keywords = keywordIndex(chunks);
  const round = (x: number, places = 3) => Math.round(x * 10 ** places) / 10 ** places;
  const percent = (share: number) => `${Math.round(share * 100)}%`;

  // The numbers that differ most between passages, in their order in the vector
  const spread = mean.map((m, j) => X.reduce((sum, x) => sum + (x[j] - m) ** 2, 0));
  const shown = spread.map((v, j) => [v, j]).sort((a, b) => b[0] - a[0]).slice(0, SHOWN_NUMBERS).map(([, j]) => j).sort((a, b) => a - b);
  const compared: number[] = [];
  for (const { label, kind } of COMPARED) {
    let point = chunks.findIndex((c) => c.path.at(-1) === label);
    if (point < 0) {
      point = chunks.findIndex((c, i) => kindOf(c.path) === kind && !compared.includes(i));
      console.warn(`Site assistant: the embeddings post compares "${label}", which is gone; it shows "${chunks[point]?.path.at(-1)}" instead`);
    }
    if (point < 0) throw new Error(`there's no passage left to compare in place of "${label}"`);
    compared.push(point);
  }

  // The one-word edit the "sync" figure makes: a small number in the passage's text, one up
  const edited = compared[0];
  const text = chunks[edited].text;
  const small = /(?<![\d.-])\b([1-9]\d?)\b(?![\d.-])/.exec(text);
  const edit = small ? { at: small.index, from: small[1], to: String(Number(small[1]) + 1) } : { at: text.lastIndexOf("."), from: ".", to: "!" };

  const similarities = X.flatMap((a, i) => X.slice(i + 1).map((b) => cosine(a, b))).sort((a, b) => a - b);
  const data = {
    model: EMBEDDING_MODEL,
    dimensions: X[0].length,
    made: new Date().toISOString().slice(0, 10),
    /** The share of the vectors' variance each PCA axis keeps */
    variance: variance.map((v) => round(v)),
    kept: { pca: round(kept(pcaFit), 2), umap: round(kept(umapFit), 2), neighbours: NEIGHBOURS },
    similarity: { least: round(similarities[0], 2), median: round(similarities[similarities.length >> 1], 2), most: round(similarities.at(-1)!, 2) },
    points: chunks.map((c, i) => ({ id: c.id, label: c.path.at(-1)!, kind: kindOf(c.path), url: c.url, pca: pcaFit[i], umap: umapFit[i] })),
    questions: QUESTIONS.map((question, q) => {
      const byMeaning = chunks
        .map((c, i) => ({ id: c.id, score: cosine(asked[q], X[i]) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, SEARCH_CANDIDATES.meaning);
      const byKeyword = keywordSearch(keywords, question, SEARCH_CANDIDATES.keyword);
      const fused = fuseRankings([byMeaning.map((m) => m.id), byKeyword]);
      const places = (ids: string[]) => ids.slice(0, RANKED).map((id) => index.get(id)!);
      return {
        text: question,
        pca: pcaAskedFit[q],
        umap: umapAskedFit[q],
        /** Points' indexes, best first, and the meaning ranking's cosine scores */
        meaning: places(byMeaning.map((m) => m.id)),
        scores: byMeaning.slice(0, RANKED).map((m) => round(m.score, 2)),
        keyword: places(byKeyword),
        fused: places(fused),
      };
    }),
    /** A few passages' numbers side by side, and how alike each is to the first (in all its numbers) */
    rows: {
      numbers: shown.map((j) => j + 1),
      passages: compared.map((p) => ({ point: p, values: shown.map((j) => round(X[p][j], 4)), similarity: round(cosine(X[compared[0]], X[p]), 2) })),
    },
    /** The passage the "sync" figure edits: the text its fingerprint is made from, and where the edit goes */
    edited: { point: edited, text, ...edit },
    /** The facts the post's text quotes (<Stat of="…" />), as it writes them */
    stats: {
      passages: String(n),
      varianceKept: percent(variance.reduce((a, b) => a + b)),
      keptPca: percent(kept(pcaFit)),
      keptUmap: percent(kept(umapFit)),
      embedAllCost: `$${embeddingCost(chunks).usd.toFixed(5)}`,
    },
  };

  // The post's text describes what the databases question shows: say if the data stops showing it
  const databases = data.questions[1];
  const label = (p: number | undefined) => (p === undefined ? "nothing" : data.points[p].label);
  if (data.points[databases.meaning[0]]?.kind !== "intro")
    console.warn(`Site assistant: the embeddings post says an introduction leads "${databases.text}" by meaning, but ${label(databases.meaning[0])} does now`);
  if (data.points[databases.fused[0]]?.kind !== "skill")
    console.warn(`Site assistant: the embeddings post says a database leads "${databases.text}" once merged, but ${label(databases.fused[0])} does now`);

  writeFileSync("src/components/blog/embeddings/map.json", `${JSON.stringify(data)}\n`);
  // Only the questions asked now, so one that's gone doesn't linger
  writeFileSync(SAVED_QUESTIONS, `${JSON.stringify(Object.fromEntries(keys.map((key) => [key, saved[key]])), null, 2)}\n`);
  console.log(
    `Site assistant: the embeddings post's data is up to date: ${n} passages; PCA keeps ${data.stats.varianceKept} of the spread and ${data.stats.keptPca} of nearest neighbours, UMAP ${data.stats.keptUmap}`,
  );
} catch (error) {
  console.error("Site assistant: couldn't make the embeddings post's data, so this build stops here.", error);
  process.exit(1);
}
