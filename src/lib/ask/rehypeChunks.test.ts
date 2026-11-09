import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compile } from "@mdx-js/mdx";
import { VFile } from "vfile";
import { chunk, type Chunk } from "./chunkText.mjs";
import rehypeChunks from "./rehypeChunks.mjs";

/** A post's chunks and compiled module, with small size limits: sections join under 5 words and split over 30 */
async function compilePost(body: string) {
  const file = new VFile({ path: "post.mdx", value: `export const metadata = { title: "A post" };\n\n${body}` });
  await compile(file, { rehypePlugins: [[rehypeChunks, { min: 5, max: 30 }]] });
  return { chunks: file.data.chunks as Chunk[], js: String(file) };
}

const words = (n: number, word = "word") => Array(n).fill(word).join(" ");

describe("rehypeChunks", () => {
  it("makes a chunk of each section, its text starting with the post's title and headings", async () => {
    const { chunks } = await compilePost(`Intro ${words(6)}\n\n## One\n\n${words(6)}\n\n### Two\n\n${words(6)}`);
    assert.deepEqual(
      chunks.map((c) => c.path),
      [["A post"], ["A post", "One"], ["A post", "One", "Two"]]
    );
    assert.equal(chunks[2].text, `A post › One › Two\n\n${words(6)}`);
  });

  it("joins a short section to the next in its ## section, or else to the one before", async () => {
    const { chunks } = await compilePost(`## One\n\nShort.\n\n### Two\n\n${words(6)}\n\n## Three\n\nAlso short.`);
    assert.equal(chunks.length, 1);
    assert.deepEqual(chunks[0].path, ["A post", "One", "Two"]);
    assert.match(chunks[0].text, /Short\.[\s\S]*word[\s\S]*Also short\./);
  });

  it("splits a long section between blocks, never inside one", async () => {
    const code = "```js\n" + Array(40).fill("x();").join("\n") + "\n```";
    const { chunks } = await compilePost(`## One\n\n${words(20, "a")}\n\n${words(20, "b")}\n\n${code}`);
    assert.equal(chunks.length, 3);
    assert.ok(chunks.every((c) => c.path.join() === "A post,One"));
    assert.match(chunks[2].text, /x\(\);(\nx\(\);){39}/);
  });

  it("reads a figure as its title and a callout as its text", async () => {
    const { chunks } = await compilePost(`## One\n\n<NetworkFigure show="grid" />\n\n<Callout>\nWorth knowing, in a box.\n</Callout>`);
    assert.match(chunks[0].text, /Figure: The grid connections are found with\n\nWorth knowing, in a box\./);
  });

  it("fails on a component it can't read", async () => {
    await assert.rejects(compilePost(`## One\n\n${words(6)}\n\n<Mystery />`), /<Mystery> has no text for the site assistant/);
  });

  it("wraps each chunk in a <section> with its id", async () => {
    const { chunks, js } = await compilePost(`## One\n\n${words(6)}\n\n## Two\n\n${words(7)}`);
    for (const c of chunks) assert.ok(js.includes(`id: "${c.id}"`));
    assert.equal(js.match(/_components\.section, \{\s*id: "c-/g)?.length, chunks.length);
  });
});

describe("chunk ids", () => {
  it("follow the text: the same text, the same id, and any change a new one", () => {
    assert.equal(chunk(["A"], "text").id, chunk(["A"], "text").id);
    assert.notEqual(chunk(["A"], "text").id, chunk(["A"], "text!").id);
    assert.notEqual(chunk(["A"], "text").id, chunk(["B"], "text").id);
    assert.match(chunk(["A"], "text").id, /^c-[0-9a-f]{12}$/);
  });
});
