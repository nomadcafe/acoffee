// v0.7 Coffee Card kinds. Stored on profiles.coffee_chat_kinds as text[] with
// a CHECK constraint matching this union. UI renders one chip per value.
export const COFFEE_CHAT_KINDS = [
  "coffee",
  "cowork",
  "dinner",
  "hike",
  "work_talk",
] as const;

export type CoffeeChatKind = (typeof COFFEE_CHAT_KINDS)[number];

// v0.9 — optional soft signal on the card. `null` = "prefer not to say"
// and renders as nothing on the public card. Kept deliberately small
// (woman / man) per the project's chosen baseline; expand here if the
// preset list grows.
export const GENDERS = ["woman", "man"] as const;
export type Gender = (typeof GENDERS)[number];

// v0.10 — bio.link-style dynamic socials. Users add links one at a time
// from this menu; each row is stored as `{ platform, value }` inside the
// `social_links` jsonb column. Per-platform regex + URL composition
// lives in lib/socials.ts so this file stays a pure type registry.
export const SOCIAL_PLATFORMS = [
  "website",
  "x",
  "instagram",
  "github",
  "linkedin",
  "youtube",
  "tiktok",
  "substack",
  "mastodon",
  "bluesky",
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
export type SocialLink = { platform: SocialPlatform; value: string };
// Soft cap so a runaway form can't bloat a row. 10 is more than any
// real user needs and matches the seeded platform count.
export const MAX_SOCIAL_LINKS = 10;

export type MyProfile = {
  id: string;
  handle: string;
  bio: string | null;
  city: string | null;
  // v0.11 — nomad-aware presence hint. ISO date (YYYY-MM-DD) the user
  // expects to leave the city by. null = residents / no end date. The
  // app treats past dates as stale (city renders without a banner) so
  // no cleanup job is needed.
  cityUntil: string | null;
  coffeeChatKinds: CoffeeChatKind[];
  gender: Gender | null;
  telegramHandle: string | null;
  whatsappNumber: string | null;
  emailContact: string | null;
  socialLinks: SocialLink[];
  avatarUrl: string | null;
};

// v0.8 form-based invite. `mode` is what the requester is asking for —
// "online" / "in_person" / "either" — not a hard constraint, just a hint
// to the host so they can decide whether to accept.
export const INVITE_MODES = ["online", "in_person", "either"] as const;
export type InviteMode = (typeof INVITE_MODES)[number];

export const INVITE_STATUSES = [
  "unconfirmed",
  "pending",
  "accepted",
  "declined",
  "expired",
] as const;
export type InviteStatus = (typeof INVITE_STATUSES)[number];

export type Invite = {
  id: string;
  hostId: string;
  requesterName: string;
  requesterEmail: string;
  requesterTopic: string;
  mode: InviteMode;
  preferredTime: string | null;
  status: InviteStatus;
  createdAt: string;
  expiresAt: string;
  decidedAt: string | null;
};
