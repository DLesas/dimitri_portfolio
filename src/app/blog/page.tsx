import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { PostList } from "@/components/blog/PostList";
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

/** The blog: every post, newest first, to filter by topic (or "coming soon" until there are any) */
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
      <PostList
        posts={posts.map((p) => ({
          slug: p.slug,
          title: p.metadata.title,
          description: p.metadata.description,
          published: p.metadata.published,
          readingMinutes: p.readingMinutes,
          tags: p.metadata.tags,
        }))}
      />
    </div>
  );
}
