import type { MetadataRoute } from "next";
import { CV_PATH, SITE_URL } from "@/lib/seo";

const PAGES = ["/", "/about", "/cv", "/contact", "/blog"];

/** sitemap.xml: every page, plus the CV itself so search engines index the PDF */
export default function sitemap(): MetadataRoute.Sitemap {
  return [...PAGES, encodeURI(CV_PATH)].map((path) => ({
    url: new URL(path, SITE_URL).href,
  }));
}
