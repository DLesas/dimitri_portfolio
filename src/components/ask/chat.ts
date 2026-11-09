import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessageChunk } from "ai";
import type { AskMessage } from "@/lib/ask/agent";
import type { Reply } from "@/lib/ask/replies";
import { replyFor } from "./answers";
import { isLimit, reachLimit } from "./limit";

/**
 * The conversation with Deeves (/api/ask), kept for as long as the tab is
 * open: the palette can close and the visitor move between pages without losing it.
 */

/** When each question was sent, and when its answer began to write: "Thought for 3s" */
const timings = new Map<string, { from: number; to?: number }>();

/** What became of the questions that weren't answered in full: stopped, or refused */
const unanswered = new Map<string, "stopped" | Reply>();

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
    const reply = replyFor(error);
    const question = lastQuestionId(askChat.messages);
    if (question) unanswered.set(question, reply);
    if (isLimit(reply)) reachLimit(reply);
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
