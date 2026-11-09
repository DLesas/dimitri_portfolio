import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { askTools, lastQuestion, recentHistory, validateConversation, type AskMessage } from "./agent";
import { MAX_HISTORY_CHARS, MAX_SEARCHES } from "./config";
import { DEPLOYED_CHUNKS } from "./deployedChunks";

const [first, second, third] = DEPLOYED_CHUNKS;
const question = (text: string): AskMessage => ({ id: text, role: "user", parts: [{ type: "text", text }] });
/** An answer that searched, and found `passages` (as the browser sends them back) */
const answered = (passages: { n: number; id: string; path?: string[]; url?: string }[]): AskMessage => ({
  id: `a${passages.map((p) => p.n).join()}`,
  role: "assistant",
  parts: [
    {
      type: "tool-search_site",
      toolCallId: `call${passages.map((p) => p.n).join()}`,
      state: "output-available",
      input: { query: "anything" },
      output: { passages: passages.map((p) => ({ path: [], url: "/", ...p, seen: false })) },
    },
    { type: "text", text: "An answer [1]." },
  ],
});
const passagesIn = (m: AskMessage) =>
  m.parts.flatMap((part) => (part.type === "tool-search_site" && part.state === "output-available" ? part.output.passages : []));

describe("recentHistory", () => {
  it("keeps the last three exchanges and the question", () => {
    const messages = [1, 2, 3, 4].flatMap((i) => [question(`q${i}`), answered([])]).concat(question("now"));
    assert.deepEqual(
      recentHistory(messages).messages.map((m) => m.id).filter((id) => id.startsWith("q") || id === "now"),
      ["q2", "q3", "q4", "now"]
    );
  });

  it("drops the oldest exchanges when the history is too long, but never the question", () => {
    const long: AskMessage = { id: "long", role: "assistant", parts: [{ type: "text", text: "x".repeat(MAX_HISTORY_CHARS) }] };
    const ids = (messages: AskMessage[]) => recentHistory(messages).messages.map((m) => m.id);
    assert.deepEqual(ids([question("q1"), long, question("q2"), answered([]), question("now")]), ["q2", "a", "now"]);
    assert.deepEqual(ids([question("q1"), long, question("now")]), ["now"]);
  });

  it("numbers new passages after any number shown, even in exchanges no longer sent", () => {
    const { messages, conversation } = recentHistory([
      question("q1"),
      answered([{ n: 7, id: first.id }]),
      ...[2, 3, 4].flatMap((i) => [question(`q${i}`), answered([])]),
      question("now"),
    ]);
    assert.ok(!messages.some((m) => m.id === "q1"));
    assert.equal(conversation.highest, 7);
    assert.equal(conversation.numbers.get(first.id), 7);
  });

  it("rebuilds earlier passages from this deployment's chunks, dropping any it doesn't have", () => {
    const sent = answered([
      { n: 1, id: first.id, path: ["Made up"], url: "https://elsewhere.example" },
      { n: 2, id: "c-000000000000" },
    ]);
    const [rebuilt] = recentHistory([question("q"), sent, question("now")]).messages.map(passagesIn).filter((p) => p.length);
    assert.deepEqual(rebuilt, [{ n: 1, id: first.id, path: first.path, url: first.url, seen: false }]);
  });

  it("keeps each passage's number, marks repeats as read, and numbers new ones past the highest", () => {
    const { messages, conversation } = recentHistory([
      question("q1"),
      answered([{ n: 4, id: first.id }]),
      question("q2"),
      answered([
        { n: 4, id: first.id },
        { n: 5, id: second.id },
      ]),
      question("now"),
    ]);
    assert.deepEqual(messages.flatMap(passagesIn).map((p) => [p.n, p.seen]), [[4, false], [4, true], [5, false]]);
    assert.equal(Math.max(...conversation.numbers.values()), 5);
    assert.equal(conversation.numbers.has(third.id), false);
  });
});

describe("search_site", () => {
  it("searches at most MAX_SEARCHES times a question, however the calls come", async () => {
    let searches = 0;
    const tools = askTools(recentHistory([question("now")]).conversation, async () => {
      searches++;
      return [first];
    });
    const calls = Array.from({ length: MAX_SEARCHES + 2 }, (_, i) =>
      tools.search_site.execute!({ query: `query ${i}` }, { toolCallId: `t${i}`, messages: [] } as never)
    );
    const outputs = await Promise.all(calls);
    assert.equal(searches, MAX_SEARCHES);
    assert.deepEqual(outputs.map((o) => "tooMany" in o && o.tooMany === true), [false, false, false, true, true]);
  });
});

describe("the browser's messages", () => {
  it("must fit the tools' schemas", async () => {
    await assert.rejects(validateConversation([{ id: "x", role: "assistant", parts: [{ type: "tool-search_site", toolCallId: "c", state: "output-available", input: { query: "q" }, output: { passages: [{ n: "one" }] } }] }]));
    assert.equal((await validateConversation([question("Hello")])).length, 1);
  });

  it("end with the visitor's question", () => {
    assert.equal(lastQuestion([question("  What has he built?  ")]), "What has he built?");
    assert.equal(lastQuestion([question("q"), answered([])]), undefined);
  });
});
