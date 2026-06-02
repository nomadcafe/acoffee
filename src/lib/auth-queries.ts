import type {
  CoffeeChatKind,
  Gender,
  Invite,
  MyProfile,
} from "./types";
import { COFFEE_CHAT_KINDS, GENDERS } from "./types";
import { cityNameFromSlug, toCitySlug } from "./city";
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
      "handle, bio, city, city_until, coffee_chat_kinds, gender, telegram_handle, whatsapp_number, email_contact, social_links, avatar_url, discoverable",
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
    // NOT NULL default true in the DB, so this is always a real boolean;
    // coerce defensively in case of a legacy null.
    discoverable: (data.discoverable as boolean | null) ?? true,
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
      "id, host_id, requester_name, requester_email, requester_topic, requested_kind, preferred_time, status, created_at, expires_at, decided_at",
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
      "id, host_id, requester_name, requester_email, requester_topic, requested_kind, preferred_time, status, created_at, expires_at, decided_at",
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

// One card on a /city/[slug] discovery page. Same public surface as the
// /[handle] card minus the gated contacts — the visitor invites from the
// card page, not the list.
export type CityCard = {
  handle: string;
  displayName: string;
  city: string | null;
  // Future-only after filtering: the row's city_until iff it's still
  // ahead of today, else null. Drives the "here until X" badge so a
  // stale past date never shows.
  cityUntil: string | null;
  status: string | null;
  avatarUrl: string | null;
  coffeeChatKinds: CoffeeChatKind[];
  gender: Gender | null;
};

// A resident with no end-date counts as "around" only while their card
// is fresh — past this window an abandoned card drops off the city page
// on its own, so the list stays a snapshot of who's here now rather than
// a permanent roster. Tune to taste.
const CITY_RESIDENT_WINDOW_DAYS = 45;

// Cards shown on /city/[slug]: people who are in `city` AND reachable
// (have a contact channel, so invites actually work) AND "present" —
// either a future city_until (a nomad passing through) or a recently-
// touched card (a local/regular). Opted-out (discoverable=false) and
// skeleton auto-handles are excluded. Sorted presence-first (soonest to
// leave at the top — invite them before they go), then fresh residents
// by recency. Capped so a big city can't return an unbounded list.
export async function listCityCards(slug: string): Promise<CityCard[]> {
  if (!isAuthConfigured()) return [];
  const name = cityNameFromSlug(slug);
  if (!name) return [];
  const supabase = await createSupabaseServer();
  const todayIso = new Date().toISOString().slice(0, 10); // city_until is a DATE
  const cutoffIso = new Date(
    Date.now() - CITY_RESIDENT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data, error } = await supabase
    .from("profiles")
    // Contact columns are filtered on below but deliberately NOT selected
    // — the list never needs the values, so they stay server-side in
    // Postgres and never reach this process.
    .select(
      "handle, bio, city, city_until, coffee_chat_kinds, gender, avatar_url, updated_at",
    )
    // ilike = case-insensitive equality (no wildcards) against the
    // Title-cased stored value.
    .ilike("city", name)
    .eq("discoverable", true)
    .not("handle", "match", AUTO_HANDLE.source)
    // Multiple .or() groups AND together: must be reachable …
    .or(
      "telegram_handle.not.is.null,whatsapp_number.not.is.null,email_contact.not.is.null",
    )
    // … and present (future end-date OR recently active).
    .or(`city_until.gte.${todayIso},updated_at.gte.${cutoffIso}`)
    .limit(50);
  if (error) return [];

  const cards = (data ?? []).map((r) => {
    const rawUntil = (r.city_until as string | null) ?? null;
    // Keep the date only if it's genuinely ahead of today; a past date
    // means "this person lives here now", so it shouldn't badge.
    const activeUntil = rawUntil && rawUntil >= todayIso ? rawUntil : null;
    return {
      handle: r.handle as string,
      displayName: deriveDisplayName(r.handle as string),
      city: (r.city as string | null) ?? null,
      cityUntil: activeUntil,
      status: (r.bio as string | null) ?? null,
      avatarUrl: (r.avatar_url as string | null) ?? null,
      coffeeChatKinds: parseChatKinds(r.coffee_chat_kinds),
      gender: parseGender(r.gender),
      _updatedAt: (r.updated_at as string | undefined) ?? "",
    };
  });

  cards.sort((a, b) => {
    // Presence-active (has a future city_until) sorts above residents.
    if (a.cityUntil && !b.cityUntil) return -1;
    if (!a.cityUntil && b.cityUntil) return 1;
    // Both leaving: soonest-to-leave first (more urgent to invite).
    if (a.cityUntil && b.cityUntil) return a.cityUntil < b.cityUntil ? -1 : 1;
    // Both residents: most recently active first.
    return a._updatedAt < b._updatedAt ? 1 : -1;
  });

  // Drop the sort-only field before returning.
  return cards.slice(0, 30).map((c) => ({
    handle: c.handle,
    displayName: c.displayName,
    city: c.city,
    cityUntil: c.cityUntil,
    status: c.status,
    avatarUrl: c.avatarUrl,
    coffeeChatKinds: c.coffeeChatKinds,
    gender: c.gender,
  }));
}

// A city with enough present cards to be worth surfacing on the home
// "people are around here" strip.
export type ActiveCity = { city: string; slug: string; count: number };

// A city needs at least this many present cards before it shows on the
// home strip — one lone card reads as "no one's here", same reasoning as
// SocialProof's floor. The /city page itself still lists from the first
// card; this floor only governs the home teaser.
const CITY_STRIP_MIN_CARDS = 2;

// Cities to feature on the home page: group the present, reachable,
// discoverable cards (same gating as listCityCards, minus the city
// filter) by normalised slug, keep those above the floor, busiest first.
// Counts come from the most-recently-active 300 present cards — enough at
// this scale; revisit with a SQL aggregate if a single city ever exceeds
// that many active cards at once.
export async function listActiveCities(limit = 8): Promise<ActiveCity[]> {
  if (!isAuthConfigured()) return [];
  const supabase = await createSupabaseServer();
  const todayIso = new Date().toISOString().slice(0, 10);
  const cutoffIso = new Date(
    Date.now() - CITY_RESIDENT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data, error } = await supabase
    .from("profiles")
    .select("city, updated_at")
    .not("city", "is", null)
    .eq("discoverable", true)
    .not("handle", "match", AUTO_HANDLE.source)
    .or(
      "telegram_handle.not.is.null,whatsapp_number.not.is.null,email_contact.not.is.null",
    )
    .or(`city_until.gte.${todayIso},updated_at.gte.${cutoffIso}`)
    .order("updated_at", { ascending: false })
    .limit(300);
  if (error) return [];

  const groups = new Map<string, { city: string; count: number }>();
  for (const r of data ?? []) {
    const city = (r.city as string | null) ?? null;
    if (!city) continue;
    const slug = toCitySlug(city);
    if (!slug) continue;
    const g = groups.get(slug);
    if (g) g.count += 1;
    else groups.set(slug, { city, count: 1 });
  }

  return [...groups.entries()]
    .filter(([, g]) => g.count >= CITY_STRIP_MIN_CARDS)
    .map(([slug, g]) => ({ city: g.city, slug, count: g.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
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
    requestedKind: (r.requested_kind as CoffeeChatKind | null) ?? null,
    preferredTime: (r.preferred_time as string | null) ?? null,
    status: r.status as Invite["status"],
    createdAt: r.created_at as string,
    expiresAt: r.expires_at as string,
    decidedAt: (r.decided_at as string | null) ?? null,
  };
}
