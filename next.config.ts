import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import { mdxOptions } from "./src/lib/blog/mdxOptions";

const nextConfig: NextConfig = {
  experimental: {
    // r3f-perf ships dist/roboto.woff.js.map pointing at a binary font with no
    // sourcesContent; Turbopack panics reading it as UTF-8. Drop when r3f-perf fixes it.
    turbopackInputSourceMaps: false,
  }
};

// Blog posts (src/content/blog/*.mdx), compiled at build time
const withMDX = createMDX({ options: mdxOptions });

export default withMDX(nextConfig);
