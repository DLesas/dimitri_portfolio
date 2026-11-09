/** Dimitri's assistant: its settings, in one place */

/** A post section shorter than this joins a neighbour; one longer splits between blocks (rehypeChunks.mjs) */
export const CHUNK_WORDS = { min: 50, max: 400 };

/** The model the site's text and visitors' questions are embedded with, through OpenRouter */
export const EMBEDDING_MODEL = "qwen/qwen3-embedding-8b";
/** Its price, for the cost estimates the sync prints */
export const EMBEDDING_USD_PER_MILLION_TOKENS = 0.01;
/**
 * What Qwen3-Embedding puts before a search, saying what it's for (the site's text goes
 * in as it is). Its instruction-aware embeddings match questions to passages better.
 */
export const QUERY_INSTRUCTION =
  "Instruct: Given a question about Dimitri Lesas's work, experience, skills or writing, retrieve passages from his website that answer it\nQuery: ";

/** The chat model that answers, through OpenRouter (":floor": its cheapest provider), and how hard it reasons first */
export const CHAT_MODEL = "deepseek/deepseek-v4.1-flash-1017:floor";
export const CHAT_REASONING_EFFORT = "low";
/** The most an answer may run to, in tokens (OpenRouter's max_tokens), reasoning included */
export const MAX_ANSWER_TOKENS = 64_000;
/** Searches the model may make for one question, before it has to answer */
export const MAX_SEARCHES = 3;

/** Passages each search returns: the best by meaning and by keyword, ranked together */
export const SEARCH_RESULTS = 10;
/** Candidates each kind of search puts forward first */
export const SEARCH_CANDIDATES = { meaning: 50, keyword: 20 };

/** The longest question, in characters */
export const MAX_QUESTION_CHARS = 500;
/** Earlier exchanges (a question and its answer, searches included) sent with each question */
export const HISTORY_EXCHANGES = 3;
/** Questions each visitor (IP) may ask a day */
export const DAILY_QUESTIONS = 10;
