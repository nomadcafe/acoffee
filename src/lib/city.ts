// Helpers for the city discovery pages (/city/[slug]).
//
// The slug is a STORED, generated DB column (profiles.city_slug =
// lower(regexp_replace(btrim(city), '\s+', '-', 'g'))). Matching and URL
// building both use that column verbatim, so there's no JS slug function
// that has to stay in sync with the DB — the generated expression is the
// single source of truth. That makes lookups exact and indexable, and
// handles names a naive reverse-mapping would miss (e.g. "Saint-Tropez").
// cityDisplayFromSlug below is cosmetic only — the empty-state heading
// when no row is available to read the real city off of.

import { type Locale } from "./i18n/dict";

// A city page is only worth indexing once it has at least this many
// present cards — below it the page noindexes (still rendering a
// "be the first" state) and stays out of the sitemap. One number shared
// by the page metadata and the sitemap so the two never disagree about
// which city pages are crawlable.
export const CITY_INDEX_FLOOR = 3;

// Build a city href segment from a (DB-generated) slug. encodeURIComponent
// keeps non-latin slugs and punctuation (apostrophes, dots) URL-safe.
export function cityHrefSlug(slug: string): string {
  return encodeURIComponent(slug);
}

// Cosmetic Title-cased name from a slug, for the page heading when there
// are no matching cards to read the real city from. "chiang-mai" →
// "Chiang Mai". Not used for matching, so its lossiness doesn't matter.
export function cityDisplayFromSlug(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/-+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// zh needs the region subtag for Intl to pick the right month names;
// en/ja work as-is. Mirrors the helper in PresenceBanner / [handle].
function localeToBcp47(locale: Locale): string {
  return locale === "zh" ? "zh-CN" : locale;
}

// Short "leaving" date for a city row's presence badge — "Jun 12", or
// "Jun 12, 2027" across a year boundary. Parses the YYYY-MM-DD as local
// components so the label is the calendar day the user typed, not a
// UTC-shifted one (same trap PresenceBanner guards against).
export function formatCityUntil(cityUntil: string, locale: Locale): string {
  const [y, m, d] = cityUntil.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(localeToBcp47(locale), {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}
