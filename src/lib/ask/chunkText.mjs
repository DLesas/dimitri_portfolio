// @ts-check
/**
 * A chunk of the site's text, as Deeves embeds, searches and cites it. Shared
 * by the blog's MDX plugin (rehypeChunks.mjs), which Node loads directly, hence plain
 * JavaScript, and by the pages and tools (pageChunks.ts, siteChunks.ts).
 */
import { createHash } from "node:crypto";

/**
 * @typedef {object} Chunk
 * @property {string} id On the page (the element wrapping the chunk) and in the database
 * @property {string[]} path Where it sits on the site, e.g. ["How the home page is built", "Measuring it"]
 * @property {string} text What's embedded and shown to the chat model: its path, then its body
 */

/**
 * A chunk's path as one line: "How the home page is built › Measuring it"
 * @param {string[]} path
 */
export const pathText = (path) => path.join(" › ");

/**
 * The chunk of `body`, found at `path`. Its id is a hash of its text, so it changes
 * exactly when the text does.
 * @param {string[]} path
 * @param {string} body
 * @returns {Chunk}
 */
export function chunk(path, body) {
  const text = `${pathText(path)}\n\n${body.trim()}`;
  return { id: `c-${createHash("sha256").update(text).digest("hex").slice(0, 12)}`, path, text };
}

/**
 * The words in `text`, for the chunk size limits
 * @param {string} text
 */
export const countWords = (text) => text.split(/\s+/).filter(Boolean).length;
