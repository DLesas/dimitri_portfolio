import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chunk } from "./chunkText.mjs";
import { EMBEDDING_MODEL } from "./config";
import { describeSync, planSync } from "./sync";

const siteChunk = (body: string) => ({ ...chunk(["Page", body], body), url: "/page" });

describe("planSync", () => {
  const kept = siteChunk("kept");
  const added = siteChunk("added");
  const oldModel = siteChunk("embedded by an older model");
  const stored = [
    { id: kept.id, model: EMBEDDING_MODEL, path: "Page › kept" },
    { id: oldModel.id, model: "an/older-model", path: "Page › embedded by an older model" },
    { id: "c-000000000000", model: EMBEDDING_MODEL, path: "Page › removed" },
  ];
  const plan = planSync([kept, added, oldModel], stored);

  it("embeds new text and text another model embedded", () => {
    assert.deepEqual(plan.embed.map((c) => c.id), [added.id, oldModel.id]);
  });

  it("deletes chunks no longer on the site, and leaves the rest", () => {
    assert.deepEqual(plan.remove.map((s) => s.id), ["c-000000000000"]);
    assert.equal(plan.unchanged, 1);
  });

  it("describes what it will do", () => {
    const text = describeSync(plan);
    assert.match(text, /^2 to embed, 1 unchanged, 1 to delete/);
    assert.match(text, /\+ Page › added/);
    assert.match(text, /- Page › removed/);
  });
});
