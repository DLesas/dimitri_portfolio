"use client";

import { useQuery } from "@tanstack/react-query";
import { READS_PATH, formatReads } from "@/lib/blog/format";
import { STORAGE_KEYS, readJSON, writeJSON } from "@/lib/storage";

/**
 * Posts' read counts (src/app/api/reads/route.ts). They're only kept in production, so
 * elsewhere, or if fetching them fails, the blog quietly shows none.
 */

async function fetchReads(slugs: string[]): Promise<Record<string, number>> {
  const response = await fetch(`${READS_PATH}?${new URLSearchParams(slugs.map((slug) => ["slug", slug]))}`);
  if (!response.ok) throw new Error(`Read counts: ${response.status}`);
  // No content: counts aren't kept here
  return response.status === 204 ? {} : (await response.json()).reads;
}

/**
 * Counts this reader on the post, once per browser (it remembers the posts it has been
 * counted on), and returns the post's count. A query rather than a mutation, so it runs
 * once however often the page mounts.
 */
async function countRead(slug: string): Promise<number | null> {
  const counted = readJSON<string[]>(STORAGE_KEYS.readPosts) ?? [];
  if (counted.includes(slug)) return (await fetchReads([slug]))[slug] ?? null;
  const response = await fetch(READS_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug }),
  });
  if (!response.ok) throw new Error(`Read counts: ${response.status}`);
  if (response.status === 204) return null;
  writeJSON(STORAGE_KEYS.readPosts, [...counted, slug]);
  return (await response.json()).reads;
}

/** A count in space kept for it from the start, so nothing moves when it arrives */
function Reads({ reads }: { reads: number | null | undefined }) {
  const shown = typeof reads === "number";
  return (
    <span
      aria-hidden={!shown}
      className="inline-block min-w-[11ch] transition-opacity duration-500"
      style={{ opacity: shown ? 1 : 0 }}
    >
      {shown ? formatReads(reads) : " "}
    </span>
  );
}

/** On a post: counts this reader, then shows the post's reads */
export function PostReads({ slug }: { slug: string }) {
  const { data } = useQuery({
    queryKey: ["reads", "post", slug],
    queryFn: () => countRead(slug),
    staleTime: Infinity,
    retry: false,
  });
  return <Reads reads={data} />;
}

/** In the blog's list: a post's reads, fetched in one request for every post listed */
export function ListedPostReads({ slug, slugs }: { slug: string; slugs: string[] }) {
  const { data } = useQuery({
    queryKey: ["reads", slugs],
    queryFn: () => fetchReads(slugs),
    staleTime: 60_000,
    retry: false,
  });
  return <Reads reads={data?.[slug]} />;
}
