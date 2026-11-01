import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

// The page is a client component, so its metadata lives here
export const metadata: Metadata = pageMetadata(
  "About",
  "About Dimitri Lesas: tech stack and experience across full-stack engineering, data engineering and machine learning at Capita and Roke."
);

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
