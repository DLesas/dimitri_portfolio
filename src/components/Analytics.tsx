import Script from "next/script";
import { CLOUDFLARE_ANALYTICS_TOKEN } from "@/lib/site";

/**
 * Cloudflare Web Analytics: counts visits, pages and referrers without cookies. On the live
 * site only, so previews and local development aren't counted, and only once the site has
 * a token. It loads after the page is interactive, and follows navigation between pages.
 */
export function Analytics() {
  if (process.env.VERCEL_ENV !== "production" || !CLOUDFLARE_ANALYTICS_TOKEN) return null;
  return (
    <Script
      type="module"
      src="https://static.cloudflareinsights.com/beacon.min.js"
      strategy="afterInteractive"
      data-cf-beacon={JSON.stringify({ token: CLOUDFLARE_ANALYTICS_TOKEN })}
    />
  );
}
