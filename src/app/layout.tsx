import type { Metadata } from "next";
import { Providers } from "./providers";
import { CitedPassage } from "@/components/CitedPassage";
import { ConsoleEasterEgg } from "@/components/ConsoleEasterEgg";
import { JsonLd } from "@/components/JsonLd";
import "./globals.css";
import { Navigation } from "@/components/Navigation";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import {
  DEFAULT_DESCRIPTION,
  OG_DESCRIPTION,
  TITLE,
  sharedOpenGraph,
  structuredData,
} from "@/lib/seo";

// Pages set their own title and description (via pageMetadata)
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DEFAULT_DESCRIPTION,
  keywords:
    "Founding Engineer, Full Stack Engineer, Technical Leadership, Data Engineering, Machine Learning, AI, React, TypeScript, Python, Next.js",
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  // Every page's own URL on lesas.dev (`./` resolves against the page's path), so the
  // copy served at dimitri-portfolio.vercel.app points search engines here
  alternates: { canonical: "./" },
  openGraph: {
    ...sharedOpenGraph,
    title: TITLE,
    description: OG_DESCRIPTION,
  },
  // Title, description and image are copied from openGraph, page by page
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="en-GB">
      {/* Text uses the system font stack (HeroUI's --font-sans) */}
      <body className="antialiased min-h-screen flex flex-col">
        <JsonLd data={structuredData} />
        <Providers>
          <ConsoleEasterEgg />
          <CitedPassage />
          <Navigation />
          <main className="flex-1">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
