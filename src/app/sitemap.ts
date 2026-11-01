import type { MetadataRoute } from "next";
import { CV_PATH, SITE_PAGES, SITE_URL } from "@/lib/site";

/** sitemap.xml: every page, plus the CV itself so search engines index the PDF */
export default function sitemap(): MetadataRoute.Sitemap {
  return [...SITE_PAGES.map((page) => page.href), encodeURI(CV_PATH)].map((path) => ({
    url: new URL(path, SITE_URL).href,
  }));
}
