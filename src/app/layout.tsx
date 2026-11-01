import type { Metadata } from "next";
import { Providers } from "./provider";
import { ConsoleEasterEgg } from "@/components/ConsoleEasterEgg";
import "./globals.css";
import Navigation from "@/components/Navigation";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  GITHUB_URL,
  LINKEDIN_URL,
  SITE_NAME,
  SITE_URL,
  sharedOpenGraph,
} from "@/lib/seo";

// Pages set their own title and description (their layout.tsx, via pageMetadata)
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: DEFAULT_TITLE, template: `%s | ${SITE_NAME}` },
  description: DEFAULT_DESCRIPTION,
  keywords:
    "Full Stack Engineer, Data Scientist, React, Python, Machine Learning, TypeScript, Next.js",
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  // Every page's own URL on lesas.dev (`./` resolves against the page's path), so the
  // copy served at dimitri-portfolio.vercel.app points search engines here
  alternates: { canonical: "./" },
  openGraph: {
    ...sharedOpenGraph,
    title: { default: DEFAULT_TITLE, template: `%s | ${SITE_NAME}` },
    description: "Building bridges between complex data and elegant solutions",
  },
  // Title, description and image are copied from openGraph, page by page
  twitter: { card: "summary_large_image" },
};

/** Who the site is about, for search engines (schema.org structured data) */
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#person`,
      name: SITE_NAME,
      url: SITE_URL,
      jobTitle: "Full Stack Engineer & Data Scientist",
      address: {
        "@type": "PostalAddress",
        addressLocality: "London",
        addressCountry: "GB",
      },
      sameAs: [LINKEDIN_URL, GITHUB_URL],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      author: { "@id": `${SITE_URL}/#person` },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="en">
      {/* Text uses the system font stack (HeroUI's --font-sans) */}
      <body className="antialiased min-h-screen flex flex-col">
        <script
          type="application/ld+json"
          // Escaping "<" keeps the JSON from closing the script tag early
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
        <Providers>
            <ConsoleEasterEgg />
            <Navigation />
            <main className="flex-1">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
