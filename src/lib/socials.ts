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
  // Build the public URL for the card from the stored value. Every
  // platform is username/handle-based, so the composer slots the value
  // into a fixed canonical URL — the stored value is never used as a
  // raw href, which is what keeps arbitrary URLs off the card.
  urlFor: (value: string) => string;
  // What the user sees when the card surfaces this row (above the
  // icon, in the tooltip). Usually `@username` or the bare hostname.
  displayLabel: (value: string) => string;
};

// Username regex helpers. Keep these compact — Twitter, IG, GH, etc.
// each have their own char-set rules but the form just needs "enough"
// to reject obvious typos. The real source of truth is the platform.
//
// Strips a leading `@` and, for reddit/twitch, the `u/` style prefix a
// user might paste, so the canonical URL composes cleanly from the bare
// handle regardless of how it was typed.
function stripAt(value: string): string {
  return value.replace(/^@/, "").replace(/^u\//i, "").trim();
}

export const PLATFORMS: Record<SocialPlatform, PlatformMeta> = {
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
  threads: {
    label: "Threads",
    placeholder: "@yourhandle",
    // Threads handles mirror Instagram's char-set.
    pattern: /^@?[A-Za-z0-9_.]{1,30}$/,
    patternError: "Username only — letters/digits/_/., up to 30 chars",
    urlFor: (v) => `https://www.threads.com/@${stripAt(v)}`,
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
  twitch: {
    label: "Twitch",
    placeholder: "yourhandle",
    pattern: /^@?[A-Za-z0-9_]{4,25}$/,
    patternError: "Username only — letters/digits/_, 4–25 chars",
    urlFor: (v) => `https://twitch.tv/${stripAt(v)}`,
    displayLabel: (v) => stripAt(v),
  },
  tiktok: {
    label: "TikTok",
    placeholder: "@yourhandle",
    pattern: /^@?[A-Za-z0-9_.]{2,24}$/,
    patternError: "Username only — letters/digits/_/., 2–24 chars",
    urlFor: (v) => `https://tiktok.com/@${stripAt(v)}`,
    displayLabel: (v) => `@${stripAt(v)}`,
  },
  reddit: {
    label: "Reddit",
    placeholder: "u/yourhandle",
    pattern: /^(?:u\/)?@?[A-Za-z0-9_-]{3,20}$/i,
    patternError: "Username only — letters/digits/_/-, 3–20 chars",
    urlFor: (v) => `https://reddit.com/user/${stripAt(v)}`,
    displayLabel: (v) => `u/${stripAt(v)}`,
  },
  facebook: {
    label: "Facebook",
    placeholder: "yourname",
    // Facebook usernames are letters/digits/dots, 5+ chars. Numeric
    // profile.php?id= links are intentionally unsupported — username only.
    pattern: /^[A-Za-z0-9.]{5,50}$/,
    patternError: "Username only — letters/digits/., 5–50 chars",
    urlFor: (v) => `https://facebook.com/${v}`,
    displayLabel: (v) => v,
  },
  substack: {
    label: "Substack",
    placeholder: "yourname",
    pattern: /^[A-Za-z0-9-]{3,30}$/,
    patternError: "Subdomain only — letters/digits/-, 3–30 chars",
    urlFor: (v) => `https://${v}.substack.com`,
    displayLabel: (v) => `${v}.substack.com`,
  },
  bluesky: {
    label: "Bluesky",
    placeholder: "you.bsky.social",
    pattern: /^@?[A-Za-z0-9.-]{3,253}$/,
    patternError: "Handle like you.bsky.social",
    urlFor: (v) => `https://bsky.app/profile/${stripAt(v)}`,
    displayLabel: (v) => `@${stripAt(v)}`,
  },
  soundcloud: {
    label: "SoundCloud",
    placeholder: "yourname",
    pattern: /^@?[A-Za-z0-9_-]{1,40}$/,
    patternError: "Username only — letters/digits/_/-, up to 40 chars",
    urlFor: (v) => `https://soundcloud.com/${stripAt(v)}`,
    displayLabel: (v) => stripAt(v),
  },
  pinterest: {
    label: "Pinterest",
    placeholder: "yourname",
    pattern: /^@?[A-Za-z0-9_]{3,30}$/,
    patternError: "Username only — letters/digits/_, 3–30 chars",
    urlFor: (v) => `https://pinterest.com/${stripAt(v)}`,
    displayLabel: (v) => stripAt(v),
  },
  letterboxd: {
    label: "Letterboxd",
    placeholder: "yourname",
    pattern: /^@?[A-Za-z0-9_]{1,30}$/,
    patternError: "Username only — letters/digits/_, up to 30 chars",
    urlFor: (v) => `https://letterboxd.com/${stripAt(v)}`,
    displayLabel: (v) => stripAt(v),
  },
  medium: {
    label: "Medium",
    placeholder: "@yourname",
    pattern: /^@?[A-Za-z0-9_.]{1,40}$/,
    patternError: "Username only — letters/digits/_/., up to 40 chars",
    urlFor: (v) => `https://medium.com/@${stripAt(v)}`,
    displayLabel: (v) => `@${stripAt(v)}`,
  },
  note: {
    label: "Note",
    placeholder: "yourname",
    // note.com creator handles: letters/digits/underscore.
    pattern: /^@?[A-Za-z0-9_]{1,30}$/,
    patternError: "Username only — letters/digits/_, up to 30 chars",
    urlFor: (v) => `https://note.com/${stripAt(v)}`,
    displayLabel: (v) => stripAt(v),
  },
  zenn: {
    label: "Zenn",
    placeholder: "yourname",
    pattern: /^@?[A-Za-z0-9_]{1,30}$/,
    patternError: "Username only — letters/digits/_, up to 30 chars",
    urlFor: (v) => `https://zenn.dev/${stripAt(v)}`,
    displayLabel: (v) => stripAt(v),
  },
  behance: {
    label: "Behance",
    placeholder: "yourname",
    pattern: /^@?[A-Za-z0-9_-]{1,40}$/,
    patternError: "Username only — letters/digits/_/-, up to 40 chars",
    urlFor: (v) => `https://www.behance.net/${stripAt(v)}`,
    displayLabel: (v) => stripAt(v),
  },
  dribbble: {
    label: "Dribbble",
    placeholder: "yourname",
    pattern: /^@?[A-Za-z0-9_-]{1,40}$/,
    patternError: "Username only — letters/digits/_/-, up to 40 chars",
    urlFor: (v) => `https://dribbble.com/${stripAt(v)}`,
    displayLabel: (v) => stripAt(v),
  },
  zhihu: {
    // 知乎 — China. The profile path uses a custom url-token, not a
    // numeric id, so it slots cleanly into the template.
    label: "Zhihu (知乎)",
    placeholder: "your-id",
    pattern: /^[A-Za-z0-9_-]{1,64}$/,
    patternError: "Profile id — letters/digits/_/-, up to 64 chars",
    urlFor: (v) => `https://www.zhihu.com/people/${v}`,
    displayLabel: (v) => v,
  },
  douban: {
    // 豆瓣 — China. people/{id} accepts the user's custom id.
    label: "Douban (豆瓣)",
    placeholder: "your-id",
    pattern: /^[A-Za-z0-9_-]{2,40}$/,
    patternError: "Profile id — letters/digits/_/-, 2–40 chars",
    urlFor: (v) => `https://www.douban.com/people/${v}/`,
    displayLabel: (v) => v,
  },
};

// Defensive parser for the jsonb column on read. Filters out anything
// the app doesn't recognise (typos, stale/retired platform names like the
// old `website`/`mastodon` free-URL rows, malformed rows) so the typed
// payload downstream never carries surprises. Values are re-checked
// against the platform `pattern` — the same gate the form runs on write —
// so a row that bypassed the form (direct DB write, legacy/pre-validation
// data) can't smuggle a malformed handle into a composed URL.
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
