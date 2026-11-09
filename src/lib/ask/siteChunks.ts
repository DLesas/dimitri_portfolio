import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { compile, type CompileOptions } from "@mdx-js/mdx";
import { VFile } from "vfile";
import { postPath } from "@/lib/blog/format";
import { mdxOptions } from "@/lib/blog/mdxOptions";
import { POSTS_DIR } from "@/lib/blog/posts";
import type { Chunk } from "./chunkText.mjs";
import { aboutIntroChunk, homeChunk, roleChunks, skillChunks, type SiteChunk } from "./pageChunks";

/**
 * Every chunk of the site's text, in page order: everything Deeves can find
 * and cite. Posts are compiled here as the site compiles them (the same plugins, so the
 * same ids), for the tools that run outside Next: the deploy's sync and `npm run ask:diff`.
 */
export async function collectChunks(): Promise<SiteChunk[]> {
  const chunks = [homeChunk(), aboutIntroChunk(), ...roleChunks(), ...skillChunks(), ...(await postChunks())];
  const ids = new Set(chunks.map((c) => c.id));
  if (ids.size < chunks.length) throw new Error("Two of the site's chunks have the same text");
  return chunks;
}

/** Each post's chunks, from its sections (rehypeChunks.mjs) */
async function postChunks(): Promise<SiteChunk[]> {
  const options = await compileOptions();
  const files = (await readdir(POSTS_DIR)).filter((name) => name.endsWith(".mdx")).sort();
  const posts = await Promise.all(
    files.map(async (name) => {
      const file = new VFile({ path: path.join(POSTS_DIR, name), value: await readFile(path.join(POSTS_DIR, name), "utf8") });
      await compile(file, options);
      const page = postPath(name.slice(0, -".mdx".length));
      return (file.data.chunks as Chunk[]).map((c) => ({ ...c, url: `${page}#${c.id}` }));
    })
  );
  return posts.flat();
}

/** The site's MDX options, with each plugin named in them imported */
async function compileOptions(): Promise<CompileOptions> {
  const load = (list: readonly (string | readonly [string, unknown])[]) =>
    Promise.all(
      list.map(async (entry) => {
        const [name, options] = typeof entry === "string" ? [entry] : entry;
        const plugin = (await import(name)).default;
        return options === undefined ? plugin : [plugin, options];
      })
    );
  return { remarkPlugins: await load(mdxOptions.remarkPlugins), rehypePlugins: await load(mdxOptions.rehypePlugins) };
}
