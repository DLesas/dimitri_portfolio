import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AskMessage } from "@/lib/ask/agent";
import { REPLIES } from "@/lib/ask/replies";
import { citedPassages, passagesByNumber, readAnswer, replyFor, type Passage } from "./answers";

const passage = (n: number): Passage & { id: string; seen: boolean } => ({ n, id: `c-${n}`, path: ["About", `P${n}`], url: `/about#c-${n}`, seen: false });
const answer = (parts: AskMessage["parts"]): AskMessage => ({ id: "a", role: "assistant", parts });
const search = (query: string, passages: number[], tooMany?: boolean): AskMessage["parts"][number] => ({
  type: "tool-search_site",
  toolCallId: query,
  state: "output-available",
  input: { query },
  output: { passages: passages.map(passage), tooMany },
});

describe("passagesByNumber", () => {
  it("collects every search's passages across the conversation", () => {
    const passages = passagesByNumber([answer([search("one", [1, 2])]), { id: "q", role: "user", parts: [{ type: "text", text: "Next?" }] }, answer([search("two", [3])])]);
    assert.deepEqual([...passages.keys()], [1, 2, 3]);
    assert.deepEqual(passages.get(3), { n: 3, path: ["About", "P3"], url: "/about#c-3" });
  });
});

describe("readAnswer", () => {
  it("joins the reasoning and the text, and knows when it's still writing", () => {
    const read = readAnswer(
      answer([
        { type: "reasoning", text: " Look it up. ", state: "done" },
        { type: "text", text: "First.", state: "done" },
        { type: "reasoning", text: "Then answer.", state: "done" },
        { type: "text", text: "Second ", state: "streaming" },
      ]),
    );
    assert.equal(read.reasoning, "Look it up.\n\nThen answer.");
    assert.equal(read.text, "First.\n\nSecond");
    assert.equal(read.writing, true);
  });

  it("shows each search as it goes, but not one past the limit", () => {
    const { searches } = readAnswer(
      answer([
        search("done", [1, 2]),
        { type: "tool-search_site", toolCallId: "e", state: "output-error", input: { query: "broken" }, errorText: "x" },
        { type: "tool-search_site", toolCallId: "s", state: "input-streaming", input: {} },
        search("over", [], true),
      ]),
    );
    assert.deepEqual(searches, [
      { query: "done", state: "done", found: 2 },
      { query: "broken", state: "failed" },
      { query: undefined, state: "searching" },
    ]);
  });

  it("lists the pages it linked to", () => {
    const { links } = readAnswer(
      answer([{ type: "tool-link_page", toolCallId: "l", state: "output-available", input: { page: "Contact" }, output: { label: "Contact", href: "/contact" } }]),
    );
    assert.deepEqual(links, [{ label: "Contact", href: "/contact" }]);
  });

  it("is empty before the answer starts", () => {
    assert.deepEqual(readAnswer(undefined), { reasoning: "", text: "", writing: false, searches: [], links: [] });
  });
});

describe("citedPassages", () => {
  it("returns each passage cited, once, in number order, skipping numbers it has no passage for", () => {
    const passages = new Map([1, 2, 3].map((n) => [n, passage(n)]));
    const cited = citedPassages("He led it [3]. Then [1, 2] and [2]; see also [9].", passages);
    assert.deepEqual(cited.map((p) => p.n), [1, 2, 3]);
  });
});

describe("replyFor", () => {
  it("shows the assistant's own words, from a refusal's body or the stream's error", () => {
    assert.equal(replyFor(new Error(JSON.stringify({ message: REPLIES.daily }))), REPLIES.daily);
    assert.equal(replyFor(new Error(REPLIES.monthly)), REPLIES.monthly);
  });

  it("shows nothing else: other words, pages and network errors are just a failure", () => {
    assert.equal(replyFor(new Error(JSON.stringify({ message: "Invalid request" }))), REPLIES.failed);
    assert.equal(replyFor(new Error("<html>Internal Server Error</html>")), REPLIES.failed);
    assert.equal(replyFor(new TypeError("Failed to fetch")), REPLIES.failed);
  });
});
