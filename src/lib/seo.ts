import type { Metadata } from "next";

/** The production address: canonical URLs, the sitemap and link previews all point here */
export const SITE_URL = "https://lesas.dev";
export const SITE_NAME = "Dimitri Lesas";

/** The role shown under the name: home page, share image, structured data, console */
export const JOB_TITLE = "Founding Engineer";
export const SPECIALISMS = "Full Stack, Data & AI";

export const DEFAULT_TITLE = `${SITE_NAME} – ${JOB_TITLE} | ${SPECIALISMS}`;
export const DEFAULT_DESCRIPTION =
  "Dimitri Lesas is a London-based founding engineer who takes products from idea to production, leading teams and building across full-stack, data and AI.";

export const LINKEDIN_URL = "https://www.linkedin.com/in/dimitri-lesas-analytics/";
export const GITHUB_URL = "https://github.com/DLesas";

/** The CV, as linked from the CV page and listed in the sitemap */
export const CV_PATH = "/Dimitri Lesas.pdf";

/** The share image, drawn by src/app/opengraph-image.tsx */
export const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: DEFAULT_TITLE,
};

/**
 * Link-preview tags every page shares. `./` resolves to the page's own path, so each
 * page gets its own og:url (the root layout's canonical URL works the same way).
 */
export const sharedOpenGraph = {
  type: "website",
  siteName: SITE_NAME,
  locale: "en_GB",
  url: "./",
} satisfies NonNullable<Metadata["openGraph"]>;

/**
 * Title and description for one page, in search results and link previews. A page's
 * metadata replaces the layout's openGraph object rather than merging into it, hence
 * the shared fields spread back in, and the share image named explicitly (Next only
 * adds opengraph-image.tsx's image where no openGraph is set below the root).
 * Twitter cards copy all of this from openGraph.
 */
export function pageMetadata(title: string, description: string): Metadata {
  return {
    title,
    description,
    openGraph: { ...sharedOpenGraph, title, description, images: [OG_IMAGE] },
  };
}
