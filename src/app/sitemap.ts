import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { listCafeSitemapEntries } from "@/lib/store";

// Public, SEO-indexable routes only. Auth-gated routes (/auth/*, /profile,
// /chiang-mai/meet) are excluded — they're noindex anyway.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries = await listCafeSitemapEntries("chiang-mai");
  // Newest café's createdAt makes a better lastModified for the directory
  // index than `now` — search engines can skip re-crawling when nothing
  // changed in the listing.
  const newestCafeAt = entries.reduce<Date>((acc, e) => {
    const d = new Date(e.createdAt);
    return d > acc ? d : acc;
  }, new Date(0));
  const directoryLastMod =
    entries.length > 0 && newestCafeAt.getTime() > 0 ? newestCafeAt : now;

  return [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/chiang-mai`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/chiang-mai/cafes`,
      lastModified: directoryLastMod,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...entries.map((e) => ({
      url: `${siteUrl}/chiang-mai/cafes/${e.slug}`,
      lastModified: new Date(e.createdAt),
      changeFrequency: "weekly" as const,
      // Pending (community-submitted, unverified) cafés get lower priority —
      // we don't want unvetted entries outranking curated ones.
      priority: e.status === "approved" ? 0.7 : 0.5,
    })),
  ];
}
