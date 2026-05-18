import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// Search-engine rules. We want:
//   * Public surfaces crawlable — `/`, `/{handle}`, `/privacy`, `/terms`
//   * Auth + edit surfaces NOT crawled — those are gated and noindex
//     anyway, but explicit disallow saves a wasted hit
//   * Next internals (`/_next/`) hidden to keep the index clean
// The `host` directive Google deprecated in 2019; not worth carrying.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/auth/", "/profile", "/_next/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
