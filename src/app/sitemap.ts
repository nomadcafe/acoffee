import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

// v0.7 surface: home is the only crawlable entry until card discovery lands.
// Auth-gated `/profile` is noindex via metadata. Public `/[handle]` card
// pages are dynamic per signed-up user — wire them in here once we have a
// way to enumerate published cards.
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
