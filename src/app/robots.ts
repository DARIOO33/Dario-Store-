import type { MetadataRoute } from "next";
import { siteUrl } from "@/src/lib/store";

// Built per request, so the sitemap address follows BETTER_AUTH_URL on the server (not at build time).
export const dynamic = "force-dynamic";

// Private or per-customer pages stay out of search engines.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/cart", "/order/", "/orders", "/profile", "/track/", "/success"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
