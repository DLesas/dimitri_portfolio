/**
 * Who the site is about and where it lives: the details that pages, metadata and the
 * contact email all repeat. The role, and the search metadata built from these, are in
 * seo.ts.
 */

/** The production address: canonical URLs, the sitemap and link previews all point here */
export const SITE_URL = "https://lesas.dev";
/** The site is named after its owner, so this is also the name on every page */
export const SITE_NAME = "Dimitri Lesas";

/** The address on the Contact page, and where its messages go unless the CONTACT_EMAIL environment variable says otherwise */
export const CONTACT_EMAIL = "dlesas@hotmail.com";

export const LOCATION = {
  city: "London",
  /** As shown on the Contact page and its map */
  label: "London, UK",
  /** ISO 3166 code, for structured data */
  countryCode: "GB",
  coordinates: [51.5074, -0.1278] as [number, number],
};

/** Profiles elsewhere, in the order the Contact page lists them */
export const SOCIAL_LINKS = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/dimitri-lesas-analytics/" },
  { label: "GitHub", href: "https://github.com/DLesas" },
] as const;

/** The pages, in navigation (and sitemap) order */
export const SITE_PAGES = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/cv", label: "CV" },
  { href: "/contact", label: "Contact" },
  { href: "/blog", label: "Blog" },
] as const;

/** The CV, as linked from the CV page and listed in the sitemap */
export const CV_PATH = "/Dimitri Lesas.pdf";
/** The name a downloaded CV is saved under */
export const CV_FILENAME = "Dimitri_Lesas_CV.pdf";
