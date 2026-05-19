// Server-only entry. Anything importing this file must run in a Server
// Component / Server Action / Route Handler — next/headers throws when
// touched from a Client Component.
//
// Client code should import the dict + types directly from `./dict`
// (pure, no Node APIs) and receive the resolved locale as a prop or via
// the LocaleProvider context.

import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./dict";

// Resolve the locale for the current request. Priority:
//   1. URL prefix (`/zh/…` or `/ja/…`) — set by proxy.ts as
//      `x-url-locale`. URL wins so a single canonical URL always
//      renders one locale (essential for SEO + hreflang).
//   2. `locale` cookie set by LanguageSwitcher (only for routes
//      without a locale prefix — auth pages, /[handle], /profile).
//   3. `Accept-Language` header from the browser.
//   4. Default to English.
export async function getLocale(): Promise<Locale> {
  const hdrs = await headers();
  const fromUrl = hdrs.get("x-url-locale");
  if (isLocale(fromUrl)) return fromUrl;

  const cookieStore = await cookies();
  const fromCookie = cookieStore.get("locale")?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const fromHeader = parseAcceptLanguage(hdrs.get("accept-language"));
  if (fromHeader) return fromHeader;

  return DEFAULT_LOCALE;
}

// Returns the right "home" href for the current request. On
// /zh/* the proxy sets `x-url-locale = "zh"`; on /ja/* it sets `ja`.
// Anywhere else the header isn't there and `/` is correct. Callers use
// this for the logo link, breadcrumbs, "back to home" buttons — so a
// user on /zh/privacy who clicks "home" stays at /zh instead of being
// dropped on / with no locale prefix and a cookie-fallback render.
export async function currentHomeHref(): Promise<"/" | "/zh" | "/ja"> {
  const hdrs = await headers();
  const urlLocale = hdrs.get("x-url-locale");
  if (urlLocale === "zh" || urlLocale === "ja") return `/${urlLocale}`;
  return "/";
}

// Walk the q-weighted Accept-Language header from most preferred to
// least and pick the first language we support. "zh-CN" / "zh-Hant"
// etc. all collapse to "zh"; same for "ja-JP" → "ja", "en-US" → "en".
function parseAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const parts = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number(qParam.split("=")[1]) : 1;
      return { tag: tag.toLowerCase(), q: Number.isNaN(q) ? 1 : q };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of parts) {
    const primary = tag.split("-")[0];
    if (isLocale(primary)) return primary;
  }
  return null;
}
