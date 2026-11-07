"use client";

import Link from "next/link";
import { useSyncExternalStore, type CSSProperties } from "react";
import { formatPostDate, postPath } from "@/lib/blog/format";
import { TAGS, type Tag } from "@/lib/blog/metadata";
import { ListedPostReads } from "./ReadCount";

/** What the blog's list shows of a post */
export interface ListedPost {
  slug: string;
  title: string;
  description: string;
  published: string;
  readingMinutes: number;
  tags: readonly Tag[];
}

/**
 * The topic the list is filtered to, kept in the address (/blog?tag=AWS) so coming back
 * to the list from a post keeps it. The server renders every post; the filter applies
 * once the page is in the browser.
 */
const topicListeners = new Set<() => void>();

function subscribeToTopic(onChange: () => void) {
  topicListeners.add(onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    topicListeners.delete(onChange);
    window.removeEventListener("popstate", onChange);
  };
}

const topicInAddress = () => new URLSearchParams(window.location.search).get("tag");

function showTopic(topic: Tag | null) {
  const url = new URL(window.location.href);
  if (topic) url.searchParams.set("tag", topic);
  else url.searchParams.delete("tag");
  // Replaced rather than pushed, so Back leaves the blog instead of stepping through filters
  window.history.replaceState(null, "", url);
  topicListeners.forEach((onChange) => onChange());
}

const chip = (on: boolean) =>
  `rounded-full border px-3 py-1.5 text-[0.82rem] font-medium leading-none transition-colors ${
    on
      ? "border-primary bg-primary text-primary-foreground"
      : "border-default-200 text-default-500 hover:border-default-400 hover:text-foreground"
  }`;

/** The blog's posts, newest first, with the topics they're tagged with to filter them by */
export function PostList({ posts }: { posts: ListedPost[] }) {
  const inAddress = useSyncExternalStore(subscribeToTopic, topicInAddress, () => null);
  // The topics any post is tagged with, in TAGS order
  const topics = TAGS.filter((t) => posts.some((p) => p.tags.includes(t)));
  const topic = topics.find((t) => t === inAddress) ?? null;
  const shown = topic ? posts.filter((p) => p.tags.includes(topic)) : posts;
  // Every post's, whatever is shown, so the read counts are fetched once
  const slugs = posts.map((p) => p.slug);

  return (
    <>
      <div
        role="group"
        aria-label="Filter posts by topic"
        className="mb-12 flex flex-wrap gap-2 enter enter-delay-150 enter-duration-600 [--enter-y:20px]"
      >
        <button type="button" aria-pressed={!topic} onClick={() => showTopic(null)} className={chip(!topic)}>
          All
        </button>
        {topics.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={topic === t}
            // Picking the shown topic again shows every post
            onClick={() => showTopic(topic === t ? null : t)}
            className={chip(topic === t)}
          >
            {t}
          </button>
        ))}
      </div>
      <ol className="grid gap-12">
        {shown.map((post, i) => (
          <li
            key={post.slug}
            className="enter enter-duration-600 [--enter-y:20px]"
            style={{ "--enter-delay": `${200 + i * 80}ms` } as CSSProperties}
          >
            <article className="group flex flex-col gap-3">
              <h2 className="font-display text-3xl leading-tight text-foreground text-balance">
                <Link href={postPath(post.slug)} className="transition-colors group-hover:text-primary">
                  {post.title}
                </Link>
              </h2>
              <p className="max-w-2xl leading-relaxed text-default-600">{post.description}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm tabular-nums text-default-500">
                <time dateTime={post.published}>{formatPostDate(post.published)}</time>
                <span>{post.readingMinutes} min read</span>
                <ListedPostReads slug={post.slug} slugs={slugs} />
                <ul className="flex flex-wrap gap-2" aria-label="Topics">
                  {post.tags.map((t) => (
                    <li key={t}>
                      <button
                        type="button"
                        aria-pressed={topic === t}
                        onClick={() => showTopic(topic === t ? null : t)}
                        className={`rounded-full px-2.5 py-0.5 text-xs transition-colors ${
                          topic === t ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20"
                        }`}
                      >
                        {t}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </li>
        ))}
      </ol>
    </>
  );
}
