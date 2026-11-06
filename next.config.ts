import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  experimental: {
    // r3f-perf ships dist/roboto.woff.js.map pointing at a binary font with no
    // sourcesContent; Turbopack panics reading it as UTF-8. Drop when r3f-perf fixes it.
    turbopackInputSourceMaps: false,
  }
};

// Blog posts (src/content/blog/*.mdx), compiled at build time. Under Turbopack, plugins are
// named as strings with plain options (Next's MDX guide), and run in this order.
const withMDX = createMDX({
  options: {
    // Tables, strikethrough and autolinks
    remarkPlugins: ["remark-gfm"],
    rehypePlugins: [
      // An id on every heading, for links to a section
      "rehype-slug",
      // The post's headings, exported as `tableOfContents` for the section rail
      "@stefanprobst/rehype-extract-toc",
      "@stefanprobst/rehype-extract-toc/mdx",
      // Syntax highlighting in both themes, as plain HTML: no JavaScript in the browser
      ["rehype-pretty-code", { theme: { light: "github-light", dark: "github-dark-dimmed" }, keepBackground: false }],
    ],
  },
});

export default withMDX(nextConfig);
