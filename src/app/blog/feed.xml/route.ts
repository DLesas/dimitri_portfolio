import { FEED_PATH, postPath } from "@/lib/blog/format";
import { getPosts } from "@/lib/blog/posts";
import { BLOG_DESCRIPTION } from "@/lib/blog/seo";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// The blog's RSS feed, built with the site: every post, newest first
export const dynamic = "force-static";

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function GET() {
  const posts = await getPosts();
  const items = posts
    .map((p) => {
      const url = `${SITE_URL}${postPath(p.slug)}`;
      return `    <item>
      <title>${escape(p.metadata.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escape(p.metadata.description)}</description>
      <pubDate>${new Date(`${p.metadata.published}T00:00:00Z`).toUTCString()}</pubDate>
${p.metadata.tags.map((t) => `      <category>${escape(t)}</category>`).join("\n")}
    </item>`;
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(`${SITE_NAME}'s blog`)}</title>
    <link>${SITE_URL}/blog</link>
    <description>${escape(BLOG_DESCRIPTION)}</description>
    <language>en-GB</language>
    <atom:link href="${SITE_URL}${FEED_PATH}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}
