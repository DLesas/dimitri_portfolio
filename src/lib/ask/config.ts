/** Dimitri's assistant: its settings, in one place */

/** A post section shorter than this joins a neighbour; one longer splits between blocks (rehypeChunks.mjs) */
export const CHUNK_WORDS = { min: 50, max: 400 };

/** The model the site's text and visitors' questions are embedded with, through OpenRouter */
export const EMBEDDING_MODEL = "qwen/qwen3-embedding-8b";
/** Its price, for the cost estimates the sync prints */
export const EMBEDDING_USD_PER_MILLION_TOKENS = 0.01;
