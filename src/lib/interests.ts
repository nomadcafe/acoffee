// Interest tags — a small, free-form-but-normalised set on each card.
// Stored on profiles.interests as text[]. The element shape lives here
// (Postgres only guards cardinality, same split socials uses) so adding
// a rule is a single-file change.
//
// Tags are normalised to lowercase hyphen-slugs ("Trail Running" →
// "trail-running", "#AI" → "ai") — the same shape as the generated
// city_slug, so matching is exact + indexable and the values render
// uniformly as `#tag` chips. No per-locale translation: a tag is its
// own slug on every surface.

// Soft cap matching the DB CHECK (profiles_interests_max). Six is plenty
// to give a card personality without turning it into a tag cloud.
export const MAX_INTERESTS = 6;

// Per-tag length bounds (post-normalisation). 2 keeps out noise like a
// lone letter; 24 is long enough for "machine-learning" / "trail-running"
// without inviting sentence-as-tag.
const MIN_TAG_LEN = 2;
const MAX_TAG_LEN = 24;

// Curated one-tap suggestions for the editor. Not an allow-list — the
// field is free-form — just a fast path to common tags so the namespace
// trends toward shared slugs instead of dispersing. Already normalised.
export const SUGGESTED_INTERESTS = [
  "ai",
  "design",
  "web3",
  "startups",
  "indie-hacking",
  "writing",
  "music",
  "photography",
  "climbing",
  "running",
  "coffee",
  "food",
] as const;

// Normalise a raw tag to its canonical slug, or null if nothing usable
// is left. Mirrors the city_slug expression (lower + collapse separators
// to single hyphen) plus a strip of the leading `#` and any char outside
// [a-z0-9-]. Returns null for empty / too-short / too-long results so
// callers can drop them silently.
export function normaliseInterest(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/^#+/, "") // drop a leading hash if the user typed one
    .replace(/[\s_]+/g, "-") // whitespace / underscores → single hyphen
    .replace(/[^a-z0-9-]/g, "") // drop anything else
    .replace(/-+/g, "-") // collapse hyphen runs
    .replace(/^-|-$/g, ""); // trim edge hyphens
  if (slug.length < MIN_TAG_LEN || slug.length > MAX_TAG_LEN) return null;
  return slug;
}

// Defensive read of the stored array (used by query mappers). Normalises,
// drops blanks, dedupes preserving order, and caps at MAX_INTERESTS so a
// legacy/oversized row can never over-render.
export function parseInterests(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const tag = normaliseInterest(item);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= MAX_INTERESTS) break;
  }
  return out;
}

// Form-submit validator: takes the JSON-parsed payload and returns either
// the clean tag array or a friendly message. Mirrors validateSocialLinks'
// shape so the action can surface a single inline field error.
export function validateInterests(
  input: unknown,
):
  | { ok: true; interests: string[] }
  | { ok: false; message: string } {
  if (!Array.isArray(input)) {
    return { ok: false, message: "Interests must be a list." };
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of input) {
    if (typeof item !== "string") {
      return { ok: false, message: "Each interest must be text." };
    }
    if (item.trim() === "") continue; // empty row — silently drop
    const tag = normaliseInterest(item);
    if (!tag) {
      return {
        ok: false,
        message: `"${item}" isn't a usable tag — use ${MIN_TAG_LEN}–${MAX_TAG_LEN} letters, digits, or hyphens.`,
      };
    }
    if (seen.has(tag)) continue; // dedupe silently
    seen.add(tag);
    out.push(tag);
  }
  if (out.length > MAX_INTERESTS) {
    return {
      ok: false,
      message: `At most ${MAX_INTERESTS} interests.`,
    };
  }
  return { ok: true, interests: out };
}
