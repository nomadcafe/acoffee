import { cache } from "react";
import {
  SLOT_ACTIVE_STATUSES,
  type AvailabilitySlot,
  type CoffeeChatKind,
  type Invite,
  type MyProfile,
} from "./types";
import { localDateInZone } from "./datetime";
import { parseInterests } from "./interests";
import { parseChatKinds, parseGender } from "./profile";
import { parseSocialLinks } from "./socials";
import {
  createSupabaseAdmin,
  createSupabaseServer,
  isAuthConfigured,
} from "./supabase/server";

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

// The owner's own row, contacts included — this backs the /profile edit
// form, which has to show the user the Telegram/email they saved.
//
// v0.18: goes through the service-role client rather than the request's
// anon+JWT one. telegram_handle / email_contact are revoked from both anon
// and authenticated (schema_v18_1.sql) — column privileges are role-wide,
// so there's no way to grant "your own row only" through them, and leaving
// them readable by `authenticated` would be no protection at all given
// signup is free. Bypassing RLS is safe here precisely because the filter
// is `id = <the JWT-validated user>`: getRequestUser() calls getUser(),
// which verifies the token server-side rather than trusting the cookie.
export async function getMyProfile(): Promise<MyProfile | null> {
  const user = await getRequestUser();
  if (!user) return null;
  const supabase = createSupabaseAdmin();
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

// The set of slot_ids currently held by a *live* invite for this host.
// "Live" is both halves: an active status AND not past its TTL. Dropping
// the TTL half is what let an abandoned `unconfirmed` invite hold a slot
// for good (see SLOT_ACTIVE_STATUSES). Shared by the host's editor and
// the public picker so the two can't disagree about what's taken.
async function takenSlotIds(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  hostId: string,
  nowIso: string,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("invites")
    .select("slot_id")
    .eq("host_id", hostId)
    .not("slot_id", "is", null)
    .in("status", SLOT_ACTIVE_STATUSES as unknown as string[])
    .gt("expires_at", nowIso);
  return new Set((data ?? []).map((r) => r.slot_id as string));
}

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

  const takenIds = await takenSlotIds(supabase, user.id, nowIso);

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

  const takenIds = await takenSlotIds(supabase, hostId, nowIso);

  // Presence binding (read side): hide any slot that falls after the host's
  // departure date so shortening a stay cleans up the visitor's booking UI
  // on its own — no cron, same read-side gating the PresenceBanner uses.
  // addSlot blocks creating these, but a host can also move their
  // city_until up after the fact; this catches that. Only bind while the
  // date is still ahead (a stale past date = "no end date"). The host's own
  // editor reads slots elsewhere, so their slots stay visible to them.
  const { data: prof } = await supabase
    .from("profiles")
    .select("city_until, timezone")
    .eq("id", hostId)
    .maybeSingle();
  const cityUntil = (prof?.city_until as string | null) ?? null;
  const tz = (prof?.timezone as string | null) ?? null;
  const bindUntil =
    cityUntil && cityUntil >= localDateInZone(new Date(), tz) ? cityUntil : null;

  return (slots ?? [])
    .filter((s) => !takenIds.has(s.id as string))
    .filter(
      (s) =>
        !bindUntil ||
        localDateInZone(new Date(s.starts_at as string), tz) <= bindUntil,
    )
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

// Trigger-generated skeleton handles ("user_<8 hex>") — accounts that
// signed in but never picked a real handle.
const AUTO_HANDLE = /^user_[a-f0-9]{8}$/;

// Count of "real" published cards for the home-page social-proof line.
// Drops the auto skeletons and rows with no bio AND no city, as a head-only
// exact count so we never pull rows just to size a number. Anonymous read
// via the public profiles_read RLS; runs under the home's hourly ISR, not
// per request.
//
// Uses AUTO_HANDLE.source via the `match` operator (PostgREST `~`, POSIX
// regex) rather than a plain `like 'user\_%'`, which would also drop
// legitimately-chosen handles like `user_smith`; the exact
// `^user_[a-f0-9]{8}$` shape leaves those in.
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
