export type Pin = {
  id: string;
  lat: number;
  lng: number;
  nickname: string | null;
  createdAt: string;
};

export type Subscriber = {
  id: string;
  email: string;
  city: string | null;
  createdAt: string;
};

export type CafeSubmissionStatus = "approved" | "pending" | "rejected";

export type Cafe = {
  id: string;
  slug: string;
  name: string;
  city: string;
  neighborhood: string | null;
  lat: number;
  lng: number;
  hasWifi: boolean;
  hasOutlets: boolean;
  laptopFriendly: boolean;
  submissionStatus: CafeSubmissionStatus;
};

export type Checkin = {
  id: string;
  profileId: string;
  cafeId: string;
  note: string | null;
  expiresAt: string;
  createdAt: string;
};

export type IntentKind = "coffee" | "cowork" | "dinner" | "hike";

export type Intent = {
  id: string;
  profileId: string;
  kind: IntentKind;
  city: string;
  expiresAt: string;
  createdAt: string;
};

export type IntentResponseStatus = "pending" | "accepted" | "declined";

export type IntentResponse = {
  id: string;
  intentId: string;
  responderId: string;
  status: IntentResponseStatus;
  contactVia: "telegram" | "whatsapp" | null;
  createdAt: string;
};

export type MyProfile = {
  handle: string;
  bio: string | null;
  currentCity: string | null;
  telegramHandle: string | null;
  whatsappNumber: string | null;
};

// Contact channels revealed to the other party AFTER a match is accepted.
// Any field can be null — Telegram/WhatsApp are optional, email is the
// fallback that's always available.
export type ContactReveal = {
  email: string | null;
  telegramHandle: string | null;
  whatsappNumber: string | null;
};
