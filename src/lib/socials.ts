import {
  SOCIAL_PLATFORMS,
  type SocialLink,
  type SocialPlatform,
} from "./types";

// One row of platform metadata. Everything the form, the public card,
// and the server-side validator need lives here so adding/removing a
// platform is a single-file change.
export type PlatformMeta = {
  // Human label for the dropdown + accessibility.
  label: string;
  // Hint text in the input — show what shape the value should take.
  placeholder: string;
  // Pattern the value must match. `i` flag for case-insensitive
  // username matches.
  pattern: RegExp;
  // Friendly error to show when `pattern` fails.
  patternError: string;
  // Build the public URL for the card from the stored value. For
  // platforms with instance variance (website, mastodon, substack
  // when fed a full URL) the value is the URL itself — composer just
  // returns it. For username-based platforms it slots the value into
  // the canonical URL.
  urlFor: (value: string) => string;
  // What the user sees when the card surfaces this row (above the
  // icon, in the tooltip). Usually `@username` or the bare hostname.
  displayLabel: (value: string) => string;
};

// Username regex helpers. Keep these compact — Twitter, IG, GH, etc.
// each have their own char-set rules but the form just needs "enough"
// to reject obvious typos. The real source of truth is the platform.
const URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

function stripAt(value: string): string {
  return value.replace(/^@/, "").trim();
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export const PLATFORMS: Record<SocialPlatform, PlatformMeta> = {
  website: {
    label: "Website",
    placeholder: "https://your.site",
    pattern: URL_RE,
    patternError: "Full URL with https://",
    urlFor: (v) => v,
    displayLabel: (v) => hostname(v),
  },
  x: {
    label: "X (Twitter)",
    placeholder: "@yourhandle",
    pattern: /^@?[A-Za-z0-9_]{1,15}$/,
    patternError: "Username only — letters/digits/_, up to 15 chars",
    urlFor: (v) => `https://x.com/${stripAt(v)}`,
    displayLabel: (v) => `@${stripAt(v)}`,
  },
  instagram: {
    label: "Instagram",
    placeholder: "@yourhandle",
    pattern: /^@?[A-Za-z0-9_.]{1,30}$/,
    patternError: "Username only — letters/digits/_/., up to 30 chars",
    urlFor: (v) => `https://instagram.com/${stripAt(v)}`,
    displayLabel: (v) => `@${stripAt(v)}`,
  },
  github: {
    label: "GitHub",
    placeholder: "yourhandle",
    pattern: /^@?[A-Za-z0-9-]{1,39}$/,
    patternError: "Username only — letters/digits/-, up to 39 chars",
    urlFor: (v) => `https://github.com/${stripAt(v)}`,
    displayLabel: (v) => `@${stripAt(v)}`,
  },
  linkedin: {
    label: "LinkedIn",
    placeholder: "yourhandle",
    pattern: /^[A-Za-z0-9_-]{3,100}$/,
    patternError: "LinkedIn username — letters/digits/-/_, 3–100 chars",
    urlFor: (v) => `https://www.linkedin.com/in/${v}`,
    displayLabel: (v) => `in/${v}`,
  },
  youtube: {
    label: "YouTube",
    placeholder: "@yourhandle",
    pattern: /^@?[A-Za-z0-9_.-]{3,30}$/,
    patternError: "Channel handle — letters/digits/_/./-, 3–30 chars",
    urlFor: (v) => `https://youtube.com/@${stripAt(v)}`,
    displayLabel: (v) => `@${stripAt(v)}`,
  },
  tiktok: {
    label: "TikTok",
    placeholder: "@yourhandle",
    pattern: /^@?[A-Za-z0-9_.]{2,24}$/,
    patternError: "Username only — letters/digits/_/., 2–24 chars",
    urlFor: (v) => `https://tiktok.com/@${stripAt(v)}`,
    displayLabel: (v) => `@${stripAt(v)}`,
  },
  substack: {
    label: "Substack",
    placeholder: "yourname",
    pattern: /^[A-Za-z0-9-]{3,30}$/,
    patternError: "Subdomain only — letters/digits/-, 3–30 chars",
    urlFor: (v) => `https://${v}.substack.com`,
    displayLabel: (v) => `${v}.substack.com`,
  },
  mastodon: {
    label: "Mastodon",
    // Instance varies (mastodon.social, hachyderm.io, fosstodon.org…),
    // so the cleanest contract is "paste your profile URL".
    placeholder: "https://mastodon.social/@you",
    pattern: URL_RE,
    patternError: "Paste your full profile URL (instance varies)",
    urlFor: (v) => v,
    displayLabel: (v) => {
      // Try to reduce to @user@instance — readable on the card.
      try {
        const u = new URL(v);
        const handle = u.pathname.replace(/^\/@?/, "");
        return `@${handle}@${u.hostname.replace(/^www\./, "")}`;
      } catch {
        return v;
      }
    },
  },
  bluesky: {
    label: "Bluesky",
    placeholder: "you.bsky.social",
    pattern: /^@?[A-Za-z0-9.-]{3,253}$/,
    patternError: "Handle like you.bsky.social",
    urlFor: (v) => `https://bsky.app/profile/${stripAt(v)}`,
    displayLabel: (v) => `@${stripAt(v)}`,
  },
};

// Defensive parser for the jsonb column on read. Filters out anything
// the app doesn't recognise (typos, stale platform names, malformed
// rows) so the typed payload downstream never carries surprises. Values
// are re-checked against the platform `pattern` — the same gate the form
// runs on write — because `website`/`mastodon` feed their stored value
// straight into the card's <a href> (urlFor: v => v). Without this a row
// that bypassed the form (direct DB write, legacy/pre-validation data)
// could smuggle a `javascript:` URL onto a public card.
export function parseSocialLinks(raw: unknown): SocialLink[] {
  if (!Array.isArray(raw)) return [];
  const out: SocialLink[] = [];
  const allowed = new Set<string>(SOCIAL_PLATFORMS);
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const platform = (item as { platform?: unknown }).platform;
    const value = (item as { value?: unknown }).value;
    if (typeof platform !== "string" || !allowed.has(platform)) continue;
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (!PLATFORMS[platform as SocialPlatform].pattern.test(trimmed)) continue;
    out.push({ platform: platform as SocialPlatform, value: trimmed });
  }
  return out;
}

// Same parser used by both the form submit path and the public-read path.
// Returns either a clean array OR a list of indexed error messages so
// the UI can surface "row 3 has a bad value".
export function validateSocialLinks(input: unknown): {
  ok: true;
  links: SocialLink[];
} | {
  ok: false;
  message: string;
} {
  if (!Array.isArray(input)) {
    return { ok: false, message: "Socials must be a list." };
  }
  if (input.length > 50) {
    return { ok: false, message: "Too many social links." };
  }
  const out: SocialLink[] = [];
  for (let i = 0; i < input.length; i++) {
    const row = input[i];
    if (!row || typeof row !== "object") {
      return { ok: false, message: `Row ${i + 1}: malformed.` };
    }
    const platform = (row as { platform?: unknown }).platform;
    const value = (row as { value?: unknown }).value;
    if (typeof platform !== "string" || !(platform in PLATFORMS)) {
      return { ok: false, message: `Row ${i + 1}: unsupported platform.` };
    }
    if (typeof value !== "string") {
      return { ok: false, message: `Row ${i + 1}: missing value.` };
    }
    const trimmed = value.trim();
    if (!trimmed) continue; // empty row — silently drop
    const meta = PLATFORMS[platform as SocialPlatform];
    if (!meta.pattern.test(trimmed)) {
      return {
        ok: false,
        message: `${meta.label}: ${meta.patternError}`,
      };
    }
    out.push({ platform: platform as SocialPlatform, value: trimmed });
  }
  return { ok: true, links: out };
}
