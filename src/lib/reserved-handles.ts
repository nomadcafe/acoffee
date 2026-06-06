// Single source of truth for handles a user cannot claim. Used by:
//
//   1. profile/actions.ts          — signup/save gate (primary)
//   2. [handle]/page.tsx           — render-time defense-in-depth
//   3. sitemap.ts                  — keep out of the URL index
//
// Adding a string here blocks any NEW claim of that handle. It does
// NOT retroactively evict an existing card; that's a separate manual
// admin step.
//
// Some entries (e.g. "chiang-mai", "sitemap.xml", "café") cannot pass
// our /^[a-z0-9_]{3,20}$/ handle regex anyway and would be rejected at
// validation. They live here as defense-in-depth — if the regex ever
// loosens (dashes, dots, accents) the reservations still hold.

// Top-level routes the dynamic /[handle] would otherwise shadow.
// Whenever you add /app/X/page.tsx, append 'X' here so a user can't
// race the next deploy and squat the URL.
const ROUTES = [
  "api",
  "auth",
  "profile",
  "settings",
  "admin",
  "about",
  "help",
  "terms",
  "privacy",
  "sitemap.xml",
  "robots.txt",
  "favicon.ico",
];

// SEO i18n prefix folders. /zh/* and /ja/* exist; /en/ doesn't (en is
// the unprefixed canonical), but reserve all three so a future routing
// swap can't silently lease them.
const LOCALES = ["zh", "ja", "en"];

// City names from the v0.5/v0.6 directory era. Pages are gone but the
// reservations stay so we can revisit a city-pages model without
// having to peel a real card off a city slug.
const CITIES = ["chiang-mai", "osaka", "lisbon", "bali"];

// Generic / brand / squat-worthy terms no individual should be able to
// claim as a personal card. Big tech, the social platforms our socials
// editor already lists, coffee vocabulary (acoffee → 'coffee' / 'cafe'
// are the obvious squat targets), and common admin / auth / site
// sections that look "official" enough to confuse a visitor.
const BRAND_AND_GENERIC = [
  // Big tech / consumer brand
  "apple",
  "google",
  "amazon",
  "facebook",
  "meta",
  "microsoft",
  "openai",
  "anthropic",
  "vercel",
  "stripe",
  "shopify",
  "airbnb",
  "uber",
  "tesla",
  "spotify",
  "netflix",

  // Social / messaging platforms (overlap with the SocialsEditor menu)
  "twitter",
  "instagram",
  "github",
  "linkedin",
  "youtube",
  "tiktok",
  "substack",
  "mastodon",
  "bluesky",
  "telegram",
  "whatsapp",
  "slack",
  "discord",
  "reddit",
  "pinterest",
  "threads",
  "facebook",
  "twitch",
  "soundcloud",
  "behance",
  "dribbble",
  "letterboxd",
  "zenn",
  "zhihu",
  "douban",

  // Coffee theme — only the two that directly collide with the
  // product name. Things like 'espresso', 'mocha', 'barista' are
  // perfectly fine personal handles and shouldn't be hostage to the
  // brand.
  "coffee",
  "cafe",

  // Org / role / contact
  "support",
  "team",
  "contact",
  "hello",
  "info",
  "founder",
  "ceo",
  "staff",

  // Admin / auth nouns
  "root",
  "system",
  "owner",
  "account",
  "register",
  "signin",
  "signup",
  "signout",
  "login",
  "logout",
  "password",
  "security",
  "billing",
  "dashboard",

  // Site sections that "feel" official
  "blog",
  "docs",
  "faq",
  "news",
  "status",
  "pricing",
  "feedback",
  "changelog",
  "roadmap",

  // Generic English words commonly squatted for SEO juice or to
  // signal fake authority. Cheap names someone could grab to game
  // search ("acoffee.com/free", "acoffee.com/finance") — block them
  // up front so the namespace stays personal.
  "finance",
  "financial",
  "free",
  "show",
  "code",
  "dot",
  "domain",
  "domains",
  "sex",
  // Keep the dating connotation off a coffee-chat product.
  "date",
  "dating",
];

// Master set. Frozen so a hot-reload doesn't accidentally mutate it.
export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  ...ROUTES,
  ...LOCALES,
  ...CITIES,
  ...BRAND_AND_GENERIC,
]);

// The sitemap historically used a different name for the same idea
// ("handles to keep out of the URL index"). Aliased here so the import
// site can stay self-documenting.
export const SHADOWED_HANDLES = RESERVED_HANDLES;
