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
  handle: string;
  bio: string | null;
  city: string | null;
  coffeeChatKinds: CoffeeChatKind[];
  telegramHandle: string | null;
  whatsappNumber: string | null;
  emailContact: string | null;
};
