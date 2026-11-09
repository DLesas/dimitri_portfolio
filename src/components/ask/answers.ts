import type { AskMessage } from "@/lib/ask/agent";
import { REPLIES, type Reply } from "@/lib/ask/replies";

/**
 * Deeves's conversation as the palette shows it: what each answer has said so far, the
 * passages it cites, and the words for one that failed. Pure, so it's tested on its own
 * (answers.test.ts).
 */

/** A passage a search found, as the answers cite it: [n] */
export interface Passage {
  n: number;
  path: string[];
  url: string;
}

/** Every passage the conversation's searches found, by number (numbers hold across the conversation) */
export function passagesByNumber(messages: AskMessage[]) {
  const passages = new Map<number, Passage>();
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type !== "tool-search_site" || part.state !== "output-available") continue;
      for (const { n, path, url } of part.output.passages) passages.set(n, { n, path, url });
    }
  }
  return passages;
}

/** One search, as its line shows it */
export interface Search {
  /** Undefined while the model is still writing it */
  query?: string;
  state: "searching" | "done" | "failed";
  /** How many passages it found, once it has */
  found?: number;
}

/** What the assistant has said so far in `message`, as the palette shows it */
export function readAnswer(message: AskMessage | undefined) {
  const parts = message?.parts ?? [];
  const reasoning: string[] = [];
  const text: string[] = [];
  const searches: Search[] = [];
  const links: { label: string; href: string }[] = [];
  let writing = false;
  for (const part of parts) {
    if (part.type === "reasoning" && part.text.trim()) reasoning.push(part.text.trim());
    else if (part.type === "text") {
      if (part.text.trim()) text.push(part.text.trim());
      writing ||= part.state === "streaming";
    } else if (part.type === "tool-search_site") {
      // A search past the limit wasn't made (agent.ts), so it isn't shown
      if (part.state === "output-available" && part.output.tooMany) continue;
      const query = part.input?.query;
      if (part.state === "output-available") searches.push({ query, state: "done", found: part.output.passages.length });
      else if (part.state === "output-error") searches.push({ query, state: "failed" });
      else searches.push({ query, state: "searching" });
    } else if (part.type === "tool-link_page" && part.state === "output-available") links.push(part.output);
  }
  return { reasoning: reasoning.join("\n\n"), text: text.join("\n\n"), writing, searches, links };
}

/** A citation in an answer: [3], or several at once, [1, 4] */
export const CITATION = /\[(\d+(?:\s*,\s*\d+)*)\]/g;

/** The passages `text` cites, in number order */
export function citedPassages(text: string, passages: Map<number, Passage>) {
  const cited = new Set<number>();
  for (const [, numbers] of text.matchAll(CITATION)) {
    for (const n of numbers.split(",")) if (passages.has(Number(n))) cited.add(Number(n));
  }
  return [...cited].sort((a, b) => a - b).map((n) => passages.get(n)!);
}

const KNOWN_REPLIES = new Set<string>(Object.values(REPLIES));

/** The visitor's words for a failed answer: the assistant's own, as a refusal's body or the stream's error, or REPLIES.failed */
export function replyFor(error: Error): Reply {
  let text: unknown = error.message;
  try {
    text = JSON.parse(error.message).message;
  } catch {}
  return typeof text === "string" && KNOWN_REPLIES.has(text) ? (text as Reply) : REPLIES.failed;
}
