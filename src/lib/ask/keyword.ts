/**
 * Keyword search, and merging it with search by meaning. BM25 scores how well a chunk's
 * words match a query's, weighting rare words more: it catches exact names (AppSync,
 * Palantir Foundry) that embeddings can blur.
 */

/** BM25's usual settings: how fast repeats of a word stop counting, and how much a long chunk is discounted */
const K1 = 1.2;
const B = 0.75;
/** Reciprocal rank fusion's usual constant: how much a top place outweighs a lower one */
const RRF_K = 60;

export interface KeywordIndex {
  ids: string[];
  lengths: number[];
  averageLength: number;
  /** Each word: the chunks it's in, and how often */
  postings: Map<string, { chunk: number; count: number }[]>;
}

/** A text's words, lower-cased: letters and digits only */
const words = (text: string) => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

/** The index of `chunks`' words, built once per server instance (about a millisecond for this site) */
export function keywordIndex(chunks: { id: string; text: string }[]): KeywordIndex {
  const postings: KeywordIndex["postings"] = new Map();
  const lengths = chunks.map((c, chunk) => {
    const counts = new Map<string, number>();
    const all = words(c.text);
    for (const word of all) counts.set(word, (counts.get(word) ?? 0) + 1);
    for (const [word, count] of counts) {
      const list = postings.get(word) ?? [];
      list.push({ chunk, count });
      postings.set(word, list);
    }
    return all.length;
  });
  const averageLength = lengths.reduce((sum, n) => sum + n, 0) / Math.max(1, lengths.length);
  return { ids: chunks.map((c) => c.id), lengths, averageLength, postings };
}

/** The ids of up to `limit` chunks matching `query`'s words, best first */
export function keywordSearch(index: KeywordIndex, query: string, limit: number): string[] {
  const scores = new Map<number, number>();
  for (const word of new Set(words(query))) {
    const list = index.postings.get(word);
    if (!list) continue;
    const idf = Math.log(1 + (index.ids.length - list.length + 0.5) / (list.length + 0.5));
    for (const { chunk, count } of list) {
      const length = index.lengths[chunk] / index.averageLength;
      scores.set(chunk, (scores.get(chunk) ?? 0) + (idf * count * (K1 + 1)) / (count + K1 * (1 - B + B * length)));
    }
  }
  return [...scores]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([chunk]) => index.ids[chunk]);
}

/**
 * Rankings merged into one (reciprocal rank fusion): each id scores 1/(60 + its place) in
 * every ranking it's in, so one found by both searches rises above one found by either
 */
export function fuseRankings(rankings: string[][]): string[] {
  const scores = new Map<string, number>();
  for (const ranking of rankings) {
    ranking.forEach((id, place) => scores.set(id, (scores.get(id) ?? 0) + 1 / (RRF_K + place + 1)));
  }
  return [...scores].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}
