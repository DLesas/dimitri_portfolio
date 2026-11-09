import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fuseRankings, keywordIndex, keywordSearch } from "./keyword";

const index = keywordIndex([
  { id: "cursors", text: "Live cursors use AWS AppSync, which charges per message" },
  { id: "physics", text: "The physics steps a fixed 60 times a second, whatever the screen" },
  { id: "grid", text: "Nodes are sorted into a grid, so each is compared with few others" },
]);

describe("keywordSearch", () => {
  it("finds a chunk by an exact name, whatever its case", () => {
    assert.deepEqual(keywordSearch(index, "what does appsync cost?", 5), ["cursors"]);
  });

  it("ranks the chunk with more of the query's words first, and leaves out ones with none", () => {
    // "per" is in the cursors chunk too, so it comes second
    assert.deepEqual(keywordSearch(index, "fixed physics steps per second", 5), ["physics", "cursors"]);
    assert.deepEqual(keywordSearch(index, "nothing like this", 5), []);
  });
});

describe("fuseRankings", () => {
  it("puts what both searches found above what either found alone", () => {
    assert.deepEqual(fuseRankings([["a", "b"], ["c", "b"]]), ["b", "a", "c"]);
  });
});
