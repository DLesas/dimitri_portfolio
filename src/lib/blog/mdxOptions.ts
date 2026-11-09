import type createMDX from "@next/mdx";

/**
 * How blog posts (src/content/blog/*.mdx) are compiled, in one place for everything that
 * compiles them. Under Turbopack, plugins are named as strings with plain options (Next's
 * MDX guide), and run in this order.
 */
export const mdxOptions = {
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
} satisfies createMDX.NextMDXOptions["options"];
