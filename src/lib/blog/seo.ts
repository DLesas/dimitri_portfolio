import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { pageMetadata, sharedOpenGraph } from "@/lib/seo";
import { FEED_PATH, postPath } from "./format";
import type { Post } from "./posts";

/**
 * Everything search engines and link previews see for the blog, built from each post's
 * metadata in one place, so every post gets all of it without writing any. Each post's
 * share image is drawn by src/app/blog/[slug]/opengraph-image.tsx, its sitemap entry by
 * src/app/sitemap.ts and its feed item by src/app/blog/feed.xml/route.ts.
 */

export const BLOG_TITLE = "Blog";
export const BLOG_DESCRIPTION =
  "Articles by Dimitri Lesas on engineering, data and AI: how things are built, and the decisions behind them.";

/**
 * The author: the root layout's Person, named here too, as Google's article results
 * read the author's name and URL from the article itself
 */
const PERSON = { "@type": "Person", "@id": `${SITE_URL}/#person`, name: SITE_NAME, url: SITE_URL };
const BLOG_ID = `${SITE_URL}/blog#blog`;
const RSS = { "application/rss+xml": FEED_PATH };

/** The blog index's title, description and feed link */
export function blogMetadata(): Metadata {
  return { ...pageMetadata(BLOG_TITLE, BLOG_DESCRIPTION), alternates: { canonical: "/blog", types: RSS } };
}

/** A post's title, description, canonical URL, feed link and article share tags */
export function postMetadata(post: Post): Metadata {
  const { title, description, published, updated, tags } = post.metadata;
  return {
    title,
    description,
    keywords: [...tags],
    alternates: { canonical: postPath(post.slug), types: RSS },
    openGraph: {
      type: "article",
      siteName: sharedOpenGraph.siteName,
      locale: sharedOpenGraph.locale,
      url: postPath(post.slug),
      title,
      description,
      publishedTime: published,
      modifiedTime: updated ?? published,
      authors: [SITE_URL],
      tags: [...tags],
    },
  };
}

/** A post as schema.org data: the article itself, and where it sits in the site */
export function postJsonLd(post: Post) {
  const { title, description, published, updated, tags } = post.metadata;
  const url = `${SITE_URL}${postPath(post.slug)}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        "@id": `${url}#post`,
        headline: title,
        description,
        url,
        mainEntityOfPage: url,
        datePublished: published,
        dateModified: updated ?? published,
        author: PERSON,
        publisher: PERSON,
        isPartOf: { "@id": BLOG_ID },
        image: `${url}/opengraph-image/share`,
        keywords: tags.join(", "),
        wordCount: post.words,
        timeRequired: `PT${post.readingMinutes}M`,
        inLanguage: "en-GB",
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
          { "@type": "ListItem", position: 2, name: BLOG_TITLE, item: `${SITE_URL}/blog` },
          { "@type": "ListItem", position: 3, name: title, item: url },
        ],
      },
    ],
  };
}

/** The blog and its posts, for the index page */
export function blogJsonLd(posts: Post[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": BLOG_ID,
    url: `${SITE_URL}/blog`,
    name: `${SITE_NAME}'s blog`,
    description: BLOG_DESCRIPTION,
    author: PERSON,
    inLanguage: "en-GB",
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      "@id": `${SITE_URL}${postPath(p.slug)}#post`,
      headline: p.metadata.title,
      url: `${SITE_URL}${postPath(p.slug)}`,
      datePublished: p.metadata.published,
    })),
  };
}
