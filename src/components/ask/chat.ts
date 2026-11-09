import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessageChunk } from "ai";
import type { AskMessage } from "@/lib/ask/agent";
import { REPLIES, type Reply } from "@/lib/ask/replies";

/**
 * The conversation with Dimitri's assistant (/api/ask), kept for as long as the tab is
 * open: the palette can close and the visitor move between pages without losing it.
 */

/** When each question was sent, and when its answer began to write: "Thought for 3s" */
const timings = new Map<string, { from: number; to?: number }>();

/** What became of the questions that weren't answered in full: stopped, or refused */
const unanswered = new Map<string, "stopped" | Reply>();

const KNOWN_REPLIES = new Set<string>(Object.values(REPLIES));

/** The visitor's words for a failed answer: the assistant's own, as a refusal's body or the stream's error, or REPLIES.failed */
function replyTo(error: Error): Reply {
  let text: unknown = error.message;
  try {
    text = JSON.parse(error.message).message;
  } catch {}
  return typeof text === "string" && KNOWN_REPLIES.has(text) ? (text as Reply) : REPLIES.failed;
}

/** The answers' stream, timing each one's thinking as it arrives */
class TimedTransport extends DefaultChatTransport<AskMessage> {
  async sendMessages(options: Parameters<DefaultChatTransport<AskMessage>["sendMessages"]>[0]) {
    const question = options.messages.at(-1)?.id;
    const timing = { from: performance.now(), to: undefined as number | undefined };
    if (question) timings.set(question, timing);
    const stream = await super.sendMessages(options);
    const wrote = () => (timing.to ??= performance.now());
    return stream.pipeThrough(
      new TransformStream<UIMessageChunk, UIMessageChunk>({
        transform(chunk, controller) {
          if (chunk.type === "text-start") wrote();
          controller.enqueue(chunk);
        },
        flush() {
          wrote();
        },
      }),
    );
  }
}

const lastQuestionId = (messages: AskMessage[]) => messages.findLast((m) => m.role === "user")?.id;

export const askChat: Chat<AskMessage> = new Chat<AskMessage>({
  transport: new TimedTransport({ api: "/api/ask" }),
  // Before the chat's status changes, so the render that shows the failure has its words
  onError: (error) => {
    const question = lastQuestionId(askChat.messages);
    if (question) unanswered.set(question, replyTo(error));
  },
});

/** Stops the answer being written, noting its question as stopped */
export function stopAnswer() {
  const question = lastQuestionId(askChat.messages);
  if (question) unanswered.set(question, "stopped");
  void askChat.stop();
}

/** Starts the conversation afresh */
export function startOver() {
  void askChat.stop();
  askChat.messages = [];
  askChat.clearError();
  timings.clear();
  unanswered.clear();
}

/** Why `question` wasn't answered in full, if it wasn't */
export const unansweredWhy = (question: string) => unanswered.get(question);

/** How long `question`'s answer thought before writing, in whole seconds (at least 1), once it has */
export function thoughtFor(question: string) {
  const timing = timings.get(question);
  return timing?.to === undefined ? undefined : Math.max(1, Math.round((timing.to - timing.from) / 1000));
}

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
