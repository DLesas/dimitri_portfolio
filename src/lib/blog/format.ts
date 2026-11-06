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

/** The path a post lives at */
export const postPath = (slug: string) => `/blog/${slug}`;

/** The blog's RSS feed */
export const FEED_PATH = "/blog/feed.xml";
