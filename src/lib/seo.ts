import type { Metadata } from "next";
import { LOCATION, SITE_NAME, SITE_URL, SOCIAL_LINKS } from "./site";

/**
 * The role shown under the name: home page, share image, structured data, console.
 * opengraph-image.tsx imports these from here and spells out the name and address
 * itself: Next puts a hash of that file's source in the og:image URL it adds to the
 * home page, so any edit to it changes the home page's link-preview tags.
 */
export const JOB_TITLE = "Founding Engineer";
export const SPECIALISMS = "Full Stack, Data & AI";

export const DEFAULT_TITLE = `${SITE_NAME} – ${JOB_TITLE} | ${SPECIALISMS}`;
export const DEFAULT_DESCRIPTION =
  "Dimitri Lesas is a London-based founding engineer who takes products from idea to production, leading teams and building across full-stack, data and AI.";

/** The home page's title, and the "Page | Name" title every other page gets */
export const TITLE = { default: DEFAULT_TITLE, template: `%s | ${SITE_NAME}` };

/** The home page's link-preview description (pages set their own) */
export const OG_DESCRIPTION =
  "Taking products from idea to production across full-stack, data and AI.";

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

/** Who the site is about, for search engines (schema.org structured data) */
export const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#person`,
      name: SITE_NAME,
      url: SITE_URL,
      jobTitle: JOB_TITLE,
      address: {
        "@type": "PostalAddress",
        addressLocality: LOCATION.city,
        addressCountry: LOCATION.countryCode,
      },
      sameAs: SOCIAL_LINKS.map((link) => link.href),
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
