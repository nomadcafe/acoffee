import type {
  CoffeeChatKind,
  Gender,
  Invite,
  InviteMode,
  MyProfile,
} from "./types";
import { COFFEE_CHAT_KINDS, GENDERS } from "./types";
import { parseSocialLinks } from "./socials";
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
      "handle, bio, city, city_until, coffee_chat_kinds, gender, telegram_handle, whatsapp_number, email_contact, social_links, avatar_url",
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
    cityUntil: (data.city_until as string | null) ?? null,
    coffeeChatKinds: parseChatKinds(data.coffee_chat_kinds),
    gender: parseGender(data.gender),
    telegramHandle: (data.telegram_handle as string | null) ?? null,
    whatsappNumber: (data.whatsapp_number as string | null) ?? null,
    emailContact: (data.email_contact as string | null) ?? null,
    socialLinks: parseSocialLinks(data.social_links),
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

// Same defensive narrowing for the gender enum. DB has CHECK but an
// older row could carry whatever — coerce anything off-list to null.
function parseGender(raw: unknown): Gender | null {
  if (typeof raw !== "string") return null;
  return (GENDERS as readonly string[]).includes(raw) ? (raw as Gender) : null;
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

// Inbox for the signed-in host: pending invites only, newest first. Auto-
// filters server-side past expires_at so a stale 8-day-old "pending" row
// doesn't sit in the UI looking actionable.
export async function getMyPendingInvites(): Promise<Invite[]> {
  if (!isAuthConfigured()) return [];
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("invites")
    .select(
      "id, host_id, requester_name, requester_email, requester_topic, mode, preferred_time, status, created_at, expires_at, decided_at",
    )
    .eq("host_id", user.id)
    .eq("status", "pending")
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToInvite);
}

// History view for the inbox tab: anything that's no longer pending
// — accepted / declined and the ones that expired without a decision.
// Pending-but-past-expiry rows surface as `expired` so the host sees
// "you missed this" instead of the row silently vanishing.
export async function getMyInviteHistory(limit = 30): Promise<Invite[]> {
  if (!isAuthConfigured()) return [];
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("invites")
    .select(
      "id, host_id, requester_name, requester_email, requester_topic, mode, preferred_time, status, created_at, expires_at, decided_at",
    )
    .eq("host_id", user.id)
    .or(
      `status.in.(accepted,declined,expired),and(status.eq.pending,expires_at.lt.${nowIso})`,
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = data ?? [];

  // Sweep on read: any pending-past-expiry row we just surfaced gets
  // updated in the background so the DB column matches what we showed
  // the user. Idempotent — re-running the WHERE clause would match
  // nothing because the rows are no longer pending. RLS lets the host
  // update their own rows (invites_update_own). Fire-and-forget; an
  // error here just means the next read will retry the sweep.
  const staleIds = rows
    .filter(
      (r) =>
        r.status === "pending" &&
        new Date(r.expires_at as string) < new Date(),
    )
    .map((r) => r.id as string);
  if (staleIds.length > 0) {
    void supabase
      .from("invites")
      .update({ status: "expired" })
      .in("id", staleIds)
      .then(({ error: sweepErr }) => {
        if (sweepErr) {
          console.warn(
            "[getMyInviteHistory] sweep failed (non-fatal)",
            sweepErr,
          );
        }
      });
  }

  return rows.map((r) => {
    const base = rowToInvite(r);
    // Surface pending-but-past-expiry rows as `expired` in the typed
    // shape even before the background sweep lands.
    if (
      base.status === "pending" &&
      new Date(base.expiresAt) < new Date()
    ) {
      return { ...base, status: "expired" as const };
    }
    return base;
  });
}

// Lightweight pending-count for the nav badge. `count: 'exact', head: true`
// is the cheap path — Supabase returns just the number, no rows. Called on
// every nav render for signed-in users, so kept fast.
export async function countMyPendingInvites(): Promise<number> {
  if (!isAuthConfigured()) return 0;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const nowIso = new Date().toISOString();
  const { count, error } = await supabase
    .from("invites")
    .select("id", { count: "exact", head: true })
    .eq("host_id", user.id)
    .eq("status", "pending")
    .gt("expires_at", nowIso);
  if (error) return 0;
  return count ?? 0;
}

// Latest published cards for the home page "Latest cards" strip. Anonymous
// read — relies on the public profiles_read RLS. Filters out the auto-
// generated `user_<hex>` skeletons and rows with no bio AND no city (no
// surface area worth showing). Capped low because the home is a render-
// hot path; loosen via `limit` if Phase 2 ever wants a real feed.
export type LatestCard = {
  handle: string;
  displayName: string;
  city: string | null;
  status: string | null;
  avatarUrl: string | null;
  // Surfaced on the strip as small emoji chips — gives each tile a
  // hint of personality without crowding the bigger /[handle] card.
  coffeeChatKinds: CoffeeChatKind[];
};

const AUTO_HANDLE = /^user_[a-f0-9]{8}$/;

export async function listLatestCards(limit = 5): Promise<LatestCard[]> {
  if (!isAuthConfigured()) return [];
  const supabase = await createSupabaseServer();
  // Over-fetch a bit so we can filter auto-handles + empty cards client-
  // side without coming back short of `limit`.
  const { data, error } = await supabase
    .from("profiles")
    .select("handle, bio, city, avatar_url, coffee_chat_kinds, created_at")
    .order("created_at", { ascending: false })
    .limit(limit * 3);
  if (error) return [];
  const rows = data ?? [];
  return rows
    .filter((r) => {
      const handle = r.handle as string;
      if (AUTO_HANDLE.test(handle)) return false;
      // Empty cards (no city, no status) read as "ghost" rows on the feed
      // — skip them so the strip is always real signal.
      if (!r.bio && !r.city) return false;
      return true;
    })
    .slice(0, limit)
    .map((r) => ({
      handle: r.handle as string,
      displayName: deriveDisplayName(r.handle as string),
      city: (r.city as string | null) ?? null,
      status: (r.bio as string | null) ?? null,
      avatarUrl: (r.avatar_url as string | null) ?? null,
      coffeeChatKinds: parseChatKinds(r.coffee_chat_kinds),
    }));
}

// "alex_nomad" → "Alex Nomad". Inline to avoid a cross-module import for
// a one-liner; mirrors the same derivation /[handle]/page.tsx + SiteNav use.
function deriveDisplayName(handle: string): string {
  return handle
    .split("_")
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
}

function rowToInvite(r: Record<string, unknown>): Invite {
  return {
    id: r.id as string,
    hostId: r.host_id as string,
    requesterName: r.requester_name as string,
    requesterEmail: r.requester_email as string,
    requesterTopic: r.requester_topic as string,
    mode: r.mode as InviteMode,
    preferredTime: (r.preferred_time as string | null) ?? null,
    status: r.status as Invite["status"],
    createdAt: r.created_at as string,
    expiresAt: r.expires_at as string,
    decidedAt: (r.decided_at as string | null) ?? null,
  };
}
