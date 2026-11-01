import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

// The page is a client component, so its metadata lives here
export const metadata: Metadata = pageMetadata(
  "Blog",
  "Upcoming articles by Dimitri Lesas on web development, AI, performance optimization and full-stack engineering."
);

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
