import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // r3f-perf ships dist/roboto.woff.js.map pointing at a binary font with no
    // sourcesContent; Turbopack panics reading it as UTF-8. Drop when r3f-perf fixes it.
    turbopackInputSourceMaps: false,
  }
};

export default nextConfig;
