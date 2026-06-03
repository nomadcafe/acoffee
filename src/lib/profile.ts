// Pure, client-safe helpers for turning raw profile/DB values into the
// shapes the card surfaces render. Kept free of next/headers and any
// server-only import so client components (SiteNav, LiveCardPreview,
// ProfileForm) and the edge OG route can all share one copy — these
// used to be duplicated in ~7 files and had already started to drift.

import {
  COFFEE_CHAT_KINDS,
  GENDERS,
  type CoffeeChatKind,
  type Gender,
} from "./types";

// "alex_nomad" → "Alex Nomad". Handles aren't real names, but a
// Title-cased derived form reads better than the raw lowercase slug.
// Falls back to the raw handle when title-casing yields nothing (e.g.
// an all-underscore handle like "___") so the card never renders an
// empty <h1> / a blank OG name.
export function deriveDisplayName(handle: string): string {
  const name = handle
    .split("_")
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
  return name || handle;
}

// Defensive: the DB column is text[] with a CHECK constraint, but a
// stray legacy value would otherwise blow up the typed read. Filter to
// the known union.
export function parseChatKinds(raw: unknown): CoffeeChatKind[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set<string>(COFFEE_CHAT_KINDS);
  return raw.filter(
    (v): v is CoffeeChatKind => typeof v === "string" && allowed.has(v),
  );
}

// Same defensive narrowing for the gender enum. DB has a CHECK but an
// older row could carry anything — coerce off-list values to null.
export function parseGender(raw: unknown): Gender | null {
  if (typeof raw !== "string") return null;
  return (GENDERS as readonly string[]).includes(raw) ? (raw as Gender) : null;
}
