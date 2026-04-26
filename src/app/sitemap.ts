import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: `${siteUrl}/chiang-mai`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];
}
