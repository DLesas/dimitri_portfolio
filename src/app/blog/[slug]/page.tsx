import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { MobileSections } from "@/components/blog/MobileSections";
import { PostHeader } from "@/components/blog/PostHeader";
import { SectionRail } from "@/components/blog/SectionRail";
import { POST_BODY_ID, POST_END_ID } from "@/components/blog/useReadingProgress";
import { getPost, getPosts } from "@/lib/blog/posts";
import { postJsonLd, postMetadata } from "@/lib/blog/seo";

// Every post is built ahead of time; any other slug is a 404
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getPosts()).map((post) => ({ slug: post.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost((await params).slug);
  return post ? postMetadata(post) : {};
}

/** A blog post: its title and details, its text, and the section rail beside it */
export default async function PostPage({ params }: Props) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  const { Content } = post;

  return (
    <article className="mx-auto w-full max-w-6xl px-6">
      <JsonLd data={postJsonLd(post)} />
      <PostHeader post={post} />
      <div className="grid gap-14 pb-28 lg:grid-cols-[minmax(0,1fr)_250px]">
        <div className="min-w-0">
          <div className="lg:hidden">
            <MobileSections sections={post.sections} words={post.words} />
          </div>
          <div id={POST_BODY_ID} className="max-w-[68ch] text-[1.06rem] leading-[1.75] text-foreground/85">
            <Content />
          </div>
          <div id={POST_END_ID} />
        </div>
        <div className="hidden lg:block">
          <SectionRail sections={post.sections} words={post.words} seed={post.slug} />
        </div>
      </div>
    </article>
  );
}
