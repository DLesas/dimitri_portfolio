import { embedMany } from "ai";
import { pathText } from "./chunkText.mjs";
import { EMBEDDING_MODEL, EMBEDDING_USD_PER_MILLION_TOKENS } from "./config";
import { embeddingModel } from "./models";
import type { SiteChunk } from "./pageChunks";
import { writeChunks, type ChunkStore, type StoredChunk } from "./store";

/**
 * Keeping the chunk table in step with the site. What would change is worked out here,
 * once, for the production deploy, which makes the change (scripts/ask/sync.ts), and for
 * `npm run ask:diff`, which only shows it (scripts/ask/diff.ts).
 */

export interface SyncPlan {
  /** New and changed text, and any embedded by another model */
  embed: SiteChunk[];
  /** Chunks no longer on the site */
  remove: StoredChunk[];
  unchanged: number;
}

/** What it takes to bring the table's `stored` chunks in line with the site's `chunks` */
export function planSync(chunks: SiteChunk[], stored: StoredChunk[]): SyncPlan {
  const models = new Map(stored.map((s) => [s.id, s.model]));
  const onSite = new Set(chunks.map((c) => c.id));
  const embed = chunks.filter((c) => models.get(c.id) !== EMBEDDING_MODEL);
  return { embed, remove: stored.filter((s) => !onSite.has(s.id)), unchanged: chunks.length - embed.length };
}

/** About what embedding `chunks` costs: a token is roughly four characters of English */
export function embeddingCost(chunks: SiteChunk[]) {
  const tokens = Math.ceil(chunks.reduce((sum, c) => sum + c.text.length, 0) / 4);
  return { tokens, usd: (tokens * EMBEDDING_USD_PER_MILLION_TOKENS) / 1_000_000 };
}

/** The plan, as the deploy's log and ask:diff print it */
export function describeSync(plan: SyncPlan) {
  const { tokens, usd } = embeddingCost(plan.embed);
  return [
    `${plan.embed.length} to embed, ${plan.unchanged} unchanged, ${plan.remove.length} to delete`,
    ...plan.embed.map((c) => `  + ${pathText(c.path)}`),
    ...plan.remove.map((s) => `  - ${s.path}`),
    plan.embed.length ? `Embedding them: about ${tokens.toLocaleString("en-GB")} tokens, about $${usd.toFixed(5)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Carries out the plan, embedding with `apiKey`'s model: the new chunks are embedded and
 * written before the old are deleted, so a failure partway leaves extra chunks, which
 * each deployment ignores, rather than missing ones. Returns the tokens embedded.
 */
export async function applySync(store: ChunkStore, plan: SyncPlan, apiKey: string) {
  let tokens = 0;
  if (plan.embed.length) {
    const { embeddings, usage } = await embedMany({
      model: embeddingModel(apiKey),
      values: plan.embed.map((c) => c.text),
      maxRetries: 5,
    });
    tokens = usage.tokens;
    await writeChunks(
      store,
      plan.embed.map((c, i) => ({
        PutRequest: {
          Item: {
            id: { S: c.id },
            text: { S: c.text },
            path: { S: pathText(c.path) },
            model: { S: EMBEDDING_MODEL },
            vector: { L: embeddings[i].map((n) => ({ N: decimal(n) })) },
          },
        },
      }))
    );
  }
  await writeChunks(
    store,
    plan.remove.map((s) => ({ DeleteRequest: { Key: { id: { S: s.id } } } }))
  );
  return tokens;
}

/**
 * A vector's value as DynamoDB stores it: 9 decimal places, far finer than cosine
 * similarity can tell apart, at about half the size of full precision (and no -0)
 */
const decimal = (n: number) => (Math.round(n * 1e9) / 1e9 || 0).toFixed(9);
