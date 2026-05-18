import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { createSupabaseServer, isAuthConfigured } from "@/lib/supabase/server";

// v0.7 indexable surface: the home + every published card. Auth-gated
// `/profile`, `/auth/*` and the 404 stay out (already noindex in metadata).
// Cards are public by RLS (profiles_read using true), so listing them in
// the sitemap is the right hand-shake — Google has the right to crawl
// them anyway; this just makes them findable.
//
// Card list capped at 1,000 to stay well under Google's 50k-URL limit
// and keep the response small. Past 1k cards we'll page or split this
// into a sitemap index — Phase 2.
const MAX_CARDS = 1000;
// Reuse RESERVED_HANDLES from [handle]/page.tsx? Avoid a cross-import for
// a list of strings we never need to mutate — just filter on read.
const SHADOWED_HANDLES = new Set([
  "api",
  "auth",
  "profile",
  "settings",
  "admin",
  "about",
  "help",
  "terms",
  "privacy",
]);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const cards = await fetchPublishedCards();
  return [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...cards.map((c) => ({
      url: `${siteUrl}/${c.handle}`,
      lastModified: new Date(c.createdAt),
      changeFrequency: "weekly" as const,
      // Auto-generated `user_<hex>` rows are technically pages too but
      // they're skeleton cards — leave them at a lower priority so they
      // don't compete with real cards in indexing budget.
      priority: c.handle.startsWith("user_") ? 0.4 : 0.7,
    })),
  ];
}

type IndexableCard = { handle: string; createdAt: string };

async function fetchPublishedCards(): Promise<IndexableCard[]> {
  if (!isAuthConfigured()) return [];
  try {
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase
      .from("profiles")
      .select("handle, created_at")
      .order("created_at", { ascending: false })
      .limit(MAX_CARDS);
    if (error) return [];
    return (data ?? [])
      .map((r) => ({
        handle: r.handle as string,
        createdAt: r.created_at as string,
      }))
      .filter((c) => !SHADOWED_HANDLES.has(c.handle.toLowerCase()));
  } catch {
    return [];
  }
}
