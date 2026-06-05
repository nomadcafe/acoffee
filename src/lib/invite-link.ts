// Shared model for the no-signup "invite someone for coffee" link.
//
// A coffee invitation is encoded entirely in the URL query string — no DB
// row, no email, no auth. Someone fills the generator at /invite, copies
// the resulting acoffee.com/invite?from=…&with=…&city=…&topic=… link, and
// sends it through their own channel (Telegram, X, WhatsApp). The recipient
// lands on a pretty card and is nudged to claim their own acoffee page.
//
// This file is pure (no Node/Edge-only deps) so the page, the OG route, and
// the client generator can all import it.

import { COFFEE_CHAT_KINDS, type CoffeeChatKind } from "@/lib/types";

// Per-field character caps. Kept short so a hand-edited URL can't blow out
// the card layout or the 1200×630 OG image. Topic gets the most room (the
// "what we'd chat about" line); names and city stay tight.
export const INVITE_LINK_LIMITS = {
  from: 40,
  to: 40,
  city: 40,
  topic: 120,
} as const;

export type InviteLinkData = {
  from: string; // who's inviting (query: from)
  to: string; // who they're inviting (query: with)
  city: string;
  topic: string;
  kind: CoffeeChatKind | null;
};

export const EMPTY_INVITE: InviteLinkData = {
  from: "",
  to: "",
  city: "",
  topic: "",
  kind: null,
};

type RawParams = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string {
  const s = Array.isArray(v) ? v[0] : v;
  return typeof s === "string" ? s : "";
}

// Collapse runs of whitespace (incl. pasted newlines) and clamp to the
// field cap, so a hand-edited URL can't break the single-line card rows.
function clean(v: string, max: number): string {
  return v.replace(/\s+/g, " ").trim().slice(0, max);
}

export function parseInviteParams(sp: RawParams): InviteLinkData {
  const kindRaw = one(sp.kind);
  const kind = (COFFEE_CHAT_KINDS as readonly string[]).includes(kindRaw)
    ? (kindRaw as CoffeeChatKind)
    : null;
  return {
    from: clean(one(sp.from), INVITE_LINK_LIMITS.from),
    to: clean(one(sp.with), INVITE_LINK_LIMITS.to),
    city: clean(one(sp.city), INVITE_LINK_LIMITS.city),
    topic: clean(one(sp.topic), INVITE_LINK_LIMITS.topic),
    kind,
  };
}

// True when the link carries enough to render an invitation (vs. an empty
// /invite, which shows the generator instead). `topic` alone is enough — an
// anonymous "someone wants to grab a coffee about X" still reads as a card.
export function hasInvite(d: InviteLinkData): boolean {
  return !!(d.from || d.to || d.city || d.topic);
}

// Serialise to a query string (no leading `?`). Stable key order so the
// same invitation always produces the same URL — nicer for caching the OG
// image and for users eyeballing the link before they send it.
export function buildInviteQuery(d: InviteLinkData): string {
  const p = new URLSearchParams();
  if (d.from) p.set("from", d.from);
  if (d.to) p.set("with", d.to);
  if (d.city) p.set("city", d.city);
  if (d.topic) p.set("topic", d.topic);
  if (d.kind) p.set("kind", d.kind);
  return p.toString();
}
