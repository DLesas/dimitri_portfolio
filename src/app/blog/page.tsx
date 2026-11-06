import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { formatPostDate, postPath } from "@/lib/blog/format";
import { getPosts } from "@/lib/blog/posts";
import { BLOG_DESCRIPTION, blogJsonLd, blogMetadata } from "@/lib/blog/seo";
import { pageMetadata } from "@/lib/seo";
import { ComingSoon } from "./ComingSoon";

export async function generateMetadata(): Promise<Metadata> {
  return (await getPosts()).length
    ? blogMetadata()
    : pageMetadata(
        "Blog",
        "Upcoming articles by Dimitri Lesas on web development, AI, performance optimization and full-stack engineering."
      );
}

/** The blog: every post, newest first (or "coming soon" until there are any) */
export default async function BlogPage() {
  const posts = await getPosts();
  if (!posts.length) return <ComingSoon />;

  return (
    <div className="mx-auto w-full max-w-4xl px-6 pb-24 pt-12">
      <JsonLd data={blogJsonLd(posts.filter((p) => !p.metadata.draft))} />
      <header className="mb-14 flex flex-col gap-4">
        <h1 className="font-display text-5xl text-foreground enter enter-duration-600 [--enter-y:20px] md:text-6xl">Blog</h1>
        <p className="max-w-2xl text-lg text-default-500 enter enter-delay-100 enter-duration-600 [--enter-y:20px]">{BLOG_DESCRIPTION}</p>
      </header>
      <ol className="grid gap-12">
        {posts.map((post, i) => (
          <li key={post.slug} className="enter enter-duration-600 [--enter-y:20px]" style={{ "--enter-delay": `${200 + i * 80}ms` } as React.CSSProperties}>
            <article className="group flex flex-col gap-3">
              <h2 className="font-display text-3xl leading-tight text-foreground text-balance">
                <Link href={postPath(post.slug)} className="transition-colors group-hover:text-primary">
                  {post.metadata.title}
                </Link>
              </h2>
              <p className="max-w-2xl leading-relaxed text-default-600">{post.metadata.description}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm tabular-nums text-default-500">
                <time dateTime={post.metadata.published}>{formatPostDate(post.metadata.published)}</time>
                <span>{post.readingMinutes} min read</span>
                {post.metadata.draft && <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs text-warning">Draft</span>}
                <ul className="flex flex-wrap gap-2" aria-label="Tags">
                  {post.metadata.tags.map((tag) => (
                    <li key={tag} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
                      {tag}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}
