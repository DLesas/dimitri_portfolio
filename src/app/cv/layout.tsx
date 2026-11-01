import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

// The page is a client component, so its metadata lives here
export const metadata: Metadata = pageMetadata(
  "CV",
  "View or download the CV of Dimitri Lesas, a London-based full-stack engineer and data scientist."
);

export default function CVLayout({ children }: { children: React.ReactNode }) {
  return children;
}
