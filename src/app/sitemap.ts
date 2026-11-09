import type { MetadataRoute } from "next";
import { postPath } from "@/lib/blog/format";
import { getPosts } from "@/lib/blog/posts";
import { CV_PATH, SITE_PAGES, SITE_URL } from "@/lib/site";

/** sitemap.xml: every page, every blog post, and the CV itself so search engines index the PDF */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = [...SITE_PAGES.map((page) => page.href), encodeURI(CV_PATH)].map((path) => ({
    url: new URL(path, SITE_URL).href,
  }));
  const posts = (await getPosts()).map((p) => ({
    url: new URL(postPath(p.slug), SITE_URL).href,
    lastModified: p.metadata.updated ?? p.metadata.published,
  }));
  return [...pages, ...posts];
}
