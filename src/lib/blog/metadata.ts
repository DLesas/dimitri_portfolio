import { z } from "zod";

/**
 * What every blog post must say about itself, and the rules it's held to. Each post
 * (src/content/blog/<slug>.mdx) exports it as `metadata`; posts.ts checks it while the site
 * builds, so a post with a missing or invalid field fails the build instead of going live
 * without its search and share details. Annotating the export in the MDX file,
 *
 *   export const metadata = /** @satisfies {import("@/lib/blog/metadata").PostMetadata} *\/ ({ ... });
 *
 * also gets the editor to underline mistakes as you type (with the MDX extension for VS Code).
 */

/** The topics posts can be tagged with. Add one here to use it; a typo fails the build. */
export const TAGS = [
  "Next.js",
  "React",
  "TypeScript",
  "three.js",
  "AWS",
  "Pulumi",
  "Infrastructure",
  "Performance",
  "Security",
  "Data",
  "AI",
  "Leadership",
] as const;

/** A calendar date, YYYY-MM-DD */
const date = z.iso.date();

export const postMetadataSchema = z
  .strictObject({
    /** The headline: the page title, the share title and the post's h1. Search results cut off past ~60 characters. */
    title: z.string().trim().min(10).max(60),
    /** The summary under the title, in search results and in link previews. Search results show 70–160 characters. */
    description: z.string().trim().min(70).max(160),
    /** When the post went out */
    published: date,
    /** When it last changed meaningfully, if since publishing */
    updated: date.optional(),
    /** One to five topics, from TAGS */
    tags: z.array(z.enum(TAGS)).min(1).max(5),
    /** Shown in development and on Vercel previews, but never in production */
    draft: z.boolean().optional(),
  })
  .refine((m) => !m.updated || m.updated >= m.published, {
    message: "updated is before published",
    path: ["updated"],
  });

/** What a post's metadata export must look like */
export type PostMetadata = z.input<typeof postMetadataSchema>;
export type Tag = (typeof TAGS)[number];
