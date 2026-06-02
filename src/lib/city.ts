// Slug helpers for the city discovery pages (/city/[slug]).
//
// Cities are stored Title-cased (normaliseCity runs on write), so a slug
// is just the lowercased name with spaces collapsed to hyphens, and the
// reverse turns hyphens back into spaces for a case-insensitive (ilike)
// DB match — we don't need to restore the Title case because the match
// ignores case. Non-latin names (東京) keep their characters in the slug
// and round-trip fine through ilike; the URL encodes them. Known v1
// limitation: cities whose real name contains a hyphen (Saint-Tropez)
// slug to "saint-tropez" and reverse to "saint tropez", which won't
// match — revisit with a stored city_slug column if those come up.

import { type Locale } from "./i18n/dict";

export function toCitySlug(city: string): string {
  return city.trim().toLowerCase().replace(/\s+/g, "-");
}

// Inverse used to build the DB query: "chiang-mai" → "chiang mai".
export function cityNameFromSlug(slug: string): string {
  return decodeURIComponent(slug).replace(/-+/g, " ").trim();
}

// Title-cased display name from a slug, used for the page heading when
// there are no matching cards (so we can't read the real city off a row).
// Mirrors normaliseCity's casing so "chiang-mai" reads "Chiang Mai".
export function cityDisplayFromSlug(slug: string): string {
  const name = cityNameFromSlug(slug);
  return name
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
