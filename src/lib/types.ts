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

export type MyProfile = {
  id: string;
  handle: string;
  bio: string | null;
  city: string | null;
  coffeeChatKinds: CoffeeChatKind[];
  telegramHandle: string | null;
  whatsappNumber: string | null;
  emailContact: string | null;
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
