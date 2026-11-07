/** A post's date as the blog shows it, e.g. "6 November 2026" (dates are calendar days, so read as UTC) */
export function formatPostDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Reading speed for reading times and "minutes left" */
export const WORDS_PER_MINUTE = 225;

/** Minutes of reading left, for a post of `words` words read to `progress` (0 to 1) */
export const minutesLeft = (words: number, progress: number) =>
  Math.max(0, Math.ceil((words * (1 - progress)) / WORDS_PER_MINUTE));

/** A post's slug, its file name: lowercase words joined by hyphens */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The path a post lives at */
export const postPath = (slug: string) => `/blog/${slug}`;

/** Where posts' read counts are counted and read (src/app/api/reads/route.ts) */
export const READS_PATH = "/api/reads";

/** A read count as the blog shows it: "1 read", "1,204 reads" */
export const formatReads = (reads: number) => `${reads.toLocaleString("en-GB")} ${reads === 1 ? "read" : "reads"}`;

/** The blog's RSS feed */
export const FEED_PATH = "/blog/feed.xml";
