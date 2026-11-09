import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { ComponentType } from "react";
import { z } from "zod";
import { SLUG_PATTERN, WORDS_PER_MINUTE } from "./format";
import { postMetadataSchema } from "./metadata";

/**
 * The blog's posts: every src/content/blog/<slug>.mdx, checked as it loads. Runs at build
 * time (every blog page is static), so a post that breaks a rule fails the build, naming
 * the post and what's wrong:
 * - its metadata must pass postMetadataSchema (metadata.ts);
 * - its headings must be ## sections and ### sub-sections, at least two sections, no #
 *   (the title is the page's only h1) and no skipped levels;
 * - its file name, the URL slug, must be lowercase words joined by hyphens.
 * Images without alt text fail too, in mdx-components.tsx.
 */

const POSTS_DIR = path.join(process.cwd(), "src/content/blog");

/** A section (##) or sub-section (###) of a post, for the section rail */
export interface Section {
  id: string;
  text: string;
  depth: 2 | 3;
}

export interface Post {
  slug: string;
  metadata: z.output<typeof postMetadataSchema>;
  sections: Section[];
  words: number;
  readingMinutes: number;
  Content: ComponentType;
}

interface TocEntry {
  value: string;
  depth: number;
  id?: string;
  children?: TocEntry[];
}

/** The post's headings, from the `tableOfContents` rehype-extract-toc exports, checked */
function sectionsOf(toc: TocEntry[], problems: string[]): Section[] {
  const sections: Section[] = [];
  const walk = (entries: TocEntry[], parentDepth: number) => {
    for (const e of entries) {
      if (e.depth === 1) problems.push(`"${e.value}" is a # heading: the title is the post's only h1, so start sections at ##`);
      else if (e.depth > 3) problems.push(`"${e.value}" is an h${e.depth}: posts use ## sections and ### sub-sections`);
      else if (e.depth !== parentDepth + 1)
        problems.push(`"${e.value}" is an h${e.depth} with no h${e.depth - 1} above it`);
      if (!e.id) problems.push(`"${e.value}" has no id`);
      if ((e.depth === 2 || e.depth === 3) && e.id) sections.push({ id: e.id, text: e.value, depth: e.depth });
      walk(e.children ?? [], e.depth);
    }
  };
  walk(toc, 1);
  if (sections.filter((s) => s.depth === 2).length < 2) problems.push("needs at least two ## sections");
  return sections;
}

/** Roughly the words a reader reads: prose only, without code, markup or the metadata */
function countWords(source: string) {
  const text = source
    // import/export blocks run to the next blank line in MDX (or the end of the file)
    .replace(/^(?:import|export)\b[\s\S]*?(?:\n[ \t]*\n|(?![\s\S]))/gm, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\]\([^)]*\)/g, " ")
    .replace(/[#>*_`~[\]|]/g, " ");
  return text.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

async function loadPost(slug: string): Promise<Post> {
  const problems: string[] = [];
  if (!SLUG_PATTERN.test(slug)) problems.push("its file name must be lowercase words joined by hyphens");

  const mod: { default: ComponentType; metadata?: unknown; tableOfContents?: TocEntry[] } = await import(
    `@/content/blog/${slug}.mdx`
  );
  const parsed = postMetadataSchema.safeParse(mod.metadata);
  if (!parsed.success) problems.push(`its metadata is invalid:\n${z.prettifyError(parsed.error)}`);
  const sections = sectionsOf(mod.tableOfContents ?? [], problems);

  if (problems.length || !parsed.success) {
    throw new Error(`Blog post "${slug}" (src/content/blog/${slug}.mdx):\n- ${problems.join("\n- ")}`);
  }
  const words = countWords(await readFile(path.join(POSTS_DIR, `${slug}.mdx`), "utf8"));
  return {
    slug,
    metadata: parsed.data,
    sections,
    words,
    readingMinutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
    Content: mod.default,
  };
}

let everyPost: Promise<Post[]> | undefined;

/** Every post, newest first; loaded once per build */
export function getPosts(): Promise<Post[]> {
  return (everyPost ??= (async () => {
    const files = (await readdir(POSTS_DIR)).filter((f) => f.endsWith(".mdx"));
    const posts = await Promise.all(files.map((f) => loadPost(f.slice(0, -".mdx".length))));
    const titles = new Map<string, string>();
    for (const p of posts) {
      const other = titles.get(p.metadata.title.toLowerCase());
      if (other) throw new Error(`Blog posts "${other}" and "${p.slug}" have the same title`);
      titles.set(p.metadata.title.toLowerCase(), p.slug);
    }
    return posts.sort((a, b) => b.metadata.published.localeCompare(a.metadata.published));
  })());
}

export async function getPost(slug: string): Promise<Post | undefined> {
  return (await getPosts()).find((p) => p.slug === slug);
}
