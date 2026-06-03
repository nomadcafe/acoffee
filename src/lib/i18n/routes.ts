// Locale-aware path + hreflang helpers for the marketing pages.
//
// Marketing surfaces (/, /privacy, /terms) live at three URLs each — the
// default-locale path is unprefixed (= en, canonical), and the non-default
// locales sit under /zh/… and /ja/…. Anything outside those three slugs
// (auth, /[handle], /profile, /invite/…) stays single-URL and reads locale
// from the cookie + Accept-Language chain — they're either user content
// (one language by definition) or noindex'd.

import type { Locale } from "./dict";

export type MarketingSlug = "/" | "/privacy" | "/terms";

// Build the URL for `slug` in `locale`. en is unprefixed so / stays the
// canonical home; zh + ja get the prefix. Trailing slashes are kept off
// to match Next's default route shape.
export function localizedPath(slug: MarketingSlug, locale: Locale): string {
  if (locale === "en") return slug;
  if (slug === "/") return `/${locale}`;
  return `/${locale}${slug}`;
}

// Metadata.alternates payload for a marketing page in a given locale.
// `canonical` always points at the locale you're rendering (so /zh/privacy
// stays canonical for itself); `languages` lists every variant — including
// the page's own locale, so the hreflang graph is fully reciprocal — plus
// `x-default` aliasing to the unprefixed en URL (Google's tiebreak).
export function marketingAlternates(slug: MarketingSlug, locale: Locale) {
  return {
    canonical: localizedPath(slug, locale),
    languages: {
      en: localizedPath(slug, "en"),
      zh: localizedPath(slug, "zh"),
      ja: localizedPath(slug, "ja"),
      "x-default": localizedPath(slug, "en"),
    },
  };
}

export const homeAlternates = (locale: Locale) =>
  marketingAlternates("/", locale);
export const privacyAlternates = (locale: Locale) =>
  marketingAlternates("/privacy", locale);
export const termsAlternates = (locale: Locale) =>
  marketingAlternates("/terms", locale);

// City discovery pages mirror the marketing 3-URL + reciprocal-hreflang
// shape, but the slug is dynamic so they get their own builder rather
// than joining the fixed MarketingSlug union.
export function cityPath(slug: string, locale: Locale): string {
  // encode so non-latin / punctuated slugs stay URL-safe.
  const seg = encodeURIComponent(slug);
  return locale === "en" ? `/city/${seg}` : `/${locale}/city/${seg}`;
}

export function cityAlternates(slug: string, locale: Locale) {
  return {
    canonical: cityPath(slug, locale),
    languages: {
      en: cityPath(slug, "en"),
      zh: cityPath(slug, "zh"),
      ja: cityPath(slug, "ja"),
      "x-default": cityPath(slug, "en"),
    },
  };
}

// Pull the locale prefix off a path so the LanguageSwitcher can ask "what
// surface is the user looking at, with whatever locale prefix stripped?"
// Returns `null` when the path isn't a marketing surface — in that case
// switching language is a cookie-only change, not a navigation.
export function stripLocalePrefix(
  pathname: string,
): { locale: Locale; rest: string } | null {
  const m = /^\/(zh|ja)(\/.*)?$/.exec(pathname);
  if (m) {
    const locale = m[1] as Locale;
    const rest = m[2] ?? "/";
    return { locale, rest };
  }
  return { locale: "en", rest: pathname };
}

// True iff `path` (after stripping locale prefix) is one of the three
// marketing surfaces with locale variants. Used by LanguageSwitcher to
// decide between URL navigation and cookie-only refresh.
export function isMarketingPath(rest: string): rest is MarketingSlug {
  return rest === "/" || rest === "/privacy" || rest === "/terms";
}
