import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

// The page is a client component, so its metadata lives here
export const metadata: Metadata = pageMetadata(
  "Contact",
  "Get in touch with Dimitri Lesas about a project, an opportunity or just a chat, by message, email, LinkedIn or GitHub."
);

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
