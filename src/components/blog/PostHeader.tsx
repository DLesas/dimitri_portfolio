import Link from "next/link";
import { Fragment, type CSSProperties } from "react";
import { formatPostDate } from "@/lib/blog/format";
import type { Post } from "@/lib/blog/posts";

/** Each word of the title rises in after the one before (the site's CSS entrance, so no JavaScript) */
const WORD_STAGGER_MS = 70;

/** A post's title, summary and details: date, reading time and tags */
export function PostHeader({ post }: { post: Post }) {
  const { title, description, published, updated, tags } = post.metadata;
  const words = title.split(" ");

  return (
    <header className="flex max-w-3xl flex-col gap-5 pb-12 pt-10">
      <Link href="/blog" className="w-fit text-sm text-default-500 transition-colors hover:text-foreground enter">
        ← All posts
      </Link>
      <h1 className="font-display text-[2.6rem] leading-[1.1] text-foreground text-balance md:text-6xl">
        {words.map((word, i) => (
          <Fragment key={i}>
            {i > 0 && " "}
            <span
              className="inline-block enter enter-duration-800 [--enter-y:0.45em]"
              style={{ "--enter-delay": `${i * WORD_STAGGER_MS}ms` } as CSSProperties}
            >
              {word}
            </span>
          </Fragment>
        ))}
      </h1>
      <p
        className="max-w-2xl text-lg leading-relaxed text-default-500 enter enter-duration-600 [--enter-y:12px] md:text-xl"
        style={{ "--enter-delay": `${words.length * WORD_STAGGER_MS + 100}ms` } as CSSProperties}
      >
        {description}
      </p>
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm tabular-nums text-default-500 enter enter-duration-600"
        style={{ "--enter-delay": `${words.length * WORD_STAGGER_MS + 200}ms` } as CSSProperties}
      >
        <time dateTime={published}>{formatPostDate(published)}</time>
        {updated && (
          <span>
            Updated <time dateTime={updated}>{formatPostDate(updated)}</time>
          </span>
        )}
        <span>{post.readingMinutes} min read</span>
        {post.metadata.draft && <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs text-warning">Draft</span>}
        <ul className="flex flex-wrap gap-2" aria-label="Tags">
          {tags.map((tag) => (
            <li key={tag} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
              {tag}
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
