import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

// The page is a client component, so its metadata lives here
export const metadata: Metadata = pageMetadata(
  "About",
  "About Dimitri Lesas: tech stack and work experience across full-stack engineering, data engineering and machine learning."
);

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
