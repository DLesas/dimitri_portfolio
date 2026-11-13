import data from "./map.json";

/**
 * A fact about the site's passages in a post's text, from the same data as its figures
 * (map.json, which production builds make from the site being deployed: scripts/ask/map.ts):
 * <Stat of="passages" /> in MDX. The site assistant reads it as nothing, as the data is
 * made from the passages themselves (src/lib/ask/rehypeChunks.mjs).
 */
export function Stat({ of }: { of: keyof typeof data.stats }) {
  const value = data.stats[of];
  if (value === undefined) throw new Error(`A blog post has a <Stat> of something map.json doesn't have: ${String(of)}`);
  return <>{value}</>;
}
