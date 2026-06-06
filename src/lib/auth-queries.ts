import { cache } from "react";
import type {
  AvailabilitySlot,
  CoffeeChatKind,
  Invite,
  MyProfile,
} from "./types";
import { parseInterests } from "./interests";
import { deriveDisplayName, parseChatKinds, parseGender } from "./profile";
import { parseSocialLinks } from "./socials";
import { createSupabaseServer, isAuthConfigured } from "./supabase/server";

// Auth-scoped reads. RLS scopes results to the signed-in user automatically.
// Use these from Server Components / Actions that need user-specific state.

// Request-memoised auth lookup. Every auth-scoped query below needs the
// signed-in user, and /profile alone fans out to several of them — without
// memoisation that's one network round-trip to the Supabase Auth API per
// query (getUser validates the JWT server-side, unlike the cookie-only
// getSession). React's cache() collapses every call within a single
// request/render pass to one validation, and is cleared between requests.
// Returns null when auth isn't configured or no one is signed in — callers
// fold both into their own empty result. Exported so SiteNav (rendered in
// the layout on every route) shares the same validation as the page body
// instead of issuing its own.
export const getRequestUser = cache(async () => {
  if (!isAuthConfigured()) return null;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export async function getMyProfile(): Promise<MyProfile | null> {
  const user = await getRequestUser();
  if (!user) return null;
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "handle, bio, city, city_until, coffee_chat_kinds, gender, telegram_handle, email_contact, social_links, avatar_url, interests, scheduling_enabled, timezone, created_at",
    )
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: user.id,
    handle: data.handle as string,
    joinedAt: data.created_at as string,
    bio: (data.bio as string | null) ?? null,
    city: (data.city as string | null) ?? null,
    cityUntil: (data.city_until as string | null) ?? null,
    coffeeChatKinds: parseChatKinds(data.coffee_chat_kinds),
    gender: parseGender(data.gender),
    telegramHandle: (data.telegram_handle as string | null) ?? null,
    emailContact: (data.email_contact as string | null) ?? null,
    socialLinks: parseSocialLinks(data.social_links),
    avatarUrl: (data.avatar_url as string | null) ?? null,
    interests: parseInterests(data.interests),
    schedulingEnabled: (data.scheduling_enabled as boolean | null) ?? false,
    timezone: (data.timezone as string | null) ?? null,
  };
}

// The join date (profiles.created_at) now rides getMyProfile.joinedAt —
// the /profile account section reads it from there rather than issuing a
// second query for the same row.

export async function getSessionUser(): Promise<{
  id: string;
  email: string | null;
} | null> {
  const user = await getRequestUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? null };
}

// The minimal profile the layout chrome needs: the nav avatar/handle and
// the onboarding banner's auto-handle check. Both render on every route,
// so this is cache()'d — they share one getUser + one profiles read per
// request instead of each issuing its own (the banner alone was a second
// auth round-trip on every navigation). `handle` is null when the profile
// row is missing; callers fall back as they see fit. Returns null when
// auth isn't configured or no one is signed in.
export const getSessionNavProfile = cache(
  async (): Promise<{
    handle: string | null;
    avatarUrl: string | null;
    email: string | null;
  } | null> => {
    const user = await getRequestUser();
    if (!user) return null;
    try {
      const supabase = await createSupabaseServer();
      const { data } = await supabase
        .from("profiles")
        .select("handle, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      return {
        handle: (data?.handle as string | undefined) ?? null,
        avatarUrl: (data?.avatar_url as string | null) ?? null,
        email: user.email ?? null,
      };
    } catch {
      return null;
    }
  },
);

// Status set in which an invite "holds" its slot (mirrors the partial
// unique index invites_slot_active_idx). A slot referenced by an invite in
// any of these is unavailable; decline/expiry frees it.
const SLOT_ACTIVE_STATUSES = ["unconfirmed", "pending", "accepted"] as const;

// The signed-in host's own future slots, each flagged `taken` when an
// active invite holds it — drives the availability editor. Two reads
// (slots, then the active invites' slot_ids) subtracted in JS, same shape
// as groupActiveCities; fine at this scale.
export async function listMySlots(): Promise<AvailabilitySlot[]> {
  const user = await getRequestUser();
  if (!user) return [];
  const supabase = await createSupabaseServer();

  const nowIso = new Date().toISOString();
  const { data: slots, error } = await supabase
    .from("availability_slots")
    .select("id, starts_at")
    .eq("host_id", user.id)
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true });
  if (error) return [];

  const { data: held } = await supabase
    .from("invites")
    .select("slot_id")
    .eq("host_id", user.id)
    .not("slot_id", "is", null)
    .in("status", SLOT_ACTIVE_STATUSES as unknown as string[]);
  const takenIds = new Set((held ?? []).map((r) => r.slot_id as string));

  return (slots ?? []).map((s) => ({
    id: s.id as string,
    startsAt: s.starts_at as string,
    taken: takenIds.has(s.id as string),
  }));
}

// A host's bookable slots for the public invite form: future slots NOT
// already held by an active invite. Anonymous-readable via the public
// availability_slots RLS. hostId is the profile id (the [handle] page
// resolves it before calling).
export async function listAvailableSlots(
  hostId: string,
): Promise<AvailabilitySlot[]> {
  if (!isAuthConfigured() || !hostId) return [];
  const supabase = await createSupabaseServer();
  const nowIso = new Date().toISOString();
  const { data: slots, error } = await supabase
    .from("availability_slots")
    .select("id, starts_at")
    .eq("host_id", hostId)
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true });
  if (error) return [];

  const { data: held } = await supabase
    .from("invites")
    .select("slot_id")
    .eq("host_id", hostId)
    .not("slot_id", "is", null)
    .in("status", SLOT_ACTIVE_STATUSES as unknown as string[]);
  const takenIds = new Set((held ?? []).map((r) => r.slot_id as string));

  return (slots ?? [])
    .filter((s) => !takenIds.has(s.id as string))
    .map((s) => ({ id: s.id as string, startsAt: s.starts_at as string }));
}

// Inbox for the signed-in host: pending invites only, newest first. Auto-
// filters server-side past expires_at so a stale 8-day-old "pending" row
// doesn't sit in the UI looking actionable.
export async function getMyPendingInvites(): Promise<Invite[]> {
  const user = await getRequestUser();
  if (!user) return [];
  const supabase = await createSupabaseServer();

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("invites")
    .select(
      "id, host_id, requester_name, requester_email, requester_topic, requested_kind, preferred_time, status, created_at, expires_at, decided_at, contact_emailed_at, last_email_error, availability_slots(starts_at)",
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
  const user = await getRequestUser();
  if (!user) return [];
  const supabase = await createSupabaseServer();

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("invites")
    .select(
      "id, host_id, requester_name, requester_email, requester_topic, requested_kind, preferred_time, status, created_at, expires_at, decided_at, contact_emailed_at, last_email_error, availability_slots(starts_at)",
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
  const user = await getRequestUser();
  if (!user) return 0;
  const supabase = await createSupabaseServer();

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

// Count of "real" published cards for the home-page social-proof line.
// Same intent as listLatestCards' filter — drop the auto skeletons and
// rows with no bio AND no city — but as a head-only exact count so we
// never pull rows just to size a number. Anonymous read via the public
// profiles_read RLS; runs under the home's hourly ISR, not per request.
//
// Reuses AUTO_HANDLE.source via the `match` operator (PostgREST `~`,
// POSIX regex) so the skeleton-handle definition stays byte-identical to
// listLatestCards' client-side filter — a plain `like 'user\_%'` would
// also drop legitimately-chosen handles like `user_smith`, which the
// exact `^user_[a-f0-9]{8}$` shape leaves in.
export async function countPublishedCards(): Promise<number> {
  if (!isAuthConfigured()) return 0;
  const supabase = await createSupabaseServer();
  const { count, error } = await supabase
    .from("profiles")
    .select("handle", { count: "exact", head: true })
    .not("handle", "match", AUTO_HANDLE.source)
    .or("bio.not.is.null,city.not.is.null");
  if (error) return 0;
  return count ?? 0;
}

function rowToInvite(r: Record<string, unknown>): Invite {
  return {
    id: r.id as string,
    hostId: r.host_id as string,
    requesterName: r.requester_name as string,
    requesterEmail: r.requester_email as string,
    requesterTopic: r.requester_topic as string,
    requestedKind: (r.requested_kind as CoffeeChatKind | null) ?? null,
    preferredTime: (r.preferred_time as string | null) ?? null,
    status: r.status as Invite["status"],
    createdAt: r.created_at as string,
    expiresAt: r.expires_at as string,
    decidedAt: (r.decided_at as string | null) ?? null,
    contactEmailedAt: (r.contact_emailed_at as string | null) ?? null,
    lastEmailError: (r.last_email_error as string | null) ?? null,
    // PostgREST embeds the linked slot as `availability_slots`
    // (object, or null when slot_id is null). Pull just its instant.
    slotStartsAt:
      ((r.availability_slots as { starts_at?: string } | null)?.starts_at as
        | string
        | undefined) ?? null,
  };
}
