import type { CoffeeChatKind, MyProfile } from "./types";
import { COFFEE_CHAT_KINDS } from "./types";
import { createSupabaseServer, isAuthConfigured } from "./supabase/server";

// Auth-scoped reads. RLS scopes results to the signed-in user automatically.
// Use these from Server Components / Actions that need user-specific state.

export async function getMyProfile(): Promise<MyProfile | null> {
  if (!isAuthConfigured()) return null;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "handle, bio, city, coffee_chat_kinds, telegram_handle, whatsapp_number, email_contact, avatar_url",
    )
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: user.id,
    handle: data.handle as string,
    bio: (data.bio as string | null) ?? null,
    city: (data.city as string | null) ?? null,
    coffeeChatKinds: parseChatKinds(data.coffee_chat_kinds),
    telegramHandle: (data.telegram_handle as string | null) ?? null,
    whatsappNumber: (data.whatsapp_number as string | null) ?? null,
    emailContact: (data.email_contact as string | null) ?? null,
    avatarUrl: (data.avatar_url as string | null) ?? null,
  };
}

// Defensive: DB column is text[] with a CHECK constraint, but a stray legacy
// value would otherwise blow up the typed read. Filter to the v0.7 union.
function parseChatKinds(raw: unknown): CoffeeChatKind[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set<string>(COFFEE_CHAT_KINDS);
  return raw.filter((v): v is CoffeeChatKind =>
    typeof v === "string" && allowed.has(v),
  );
}

// Account-section stats for /profile. v0.7 only tracks join date — the
// pre-Card intent/match/checkin counts went away with the v0.5 surface.
export type ProfileStats = {
  joinedAt: string;
};

export async function getMyProfileStats(): Promise<ProfileStats | null> {
  if (!isAuthConfigured()) return null;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("created_at")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return { joinedAt: data.created_at as string };
}

export async function getSessionUser(): Promise<{
  id: string;
  email: string | null;
} | null> {
  if (!isAuthConfigured()) return null;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? null };
}
