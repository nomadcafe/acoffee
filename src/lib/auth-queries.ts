import type {
  CoffeeChatKind,
  Gender,
  Invite,
  MyProfile,
} from "./types";
import { CITY_INDEX_FLOOR } from "./city";
import { parseInterests } from "./interests";
import { deriveDisplayName, parseChatKinds, parseGender } from "./profile";
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
      "handle, bio, city, city_until, coffee_chat_kinds, gender, telegram_handle, email_contact, social_links, avatar_url, interests, discoverable",
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
    emailContact: (data.email_contact as string | null) ?? null,
    socialLinks: parseSocialLinks(data.social_links),
    avatarUrl: (data.avatar_url as string | null) ?? null,
    interests: parseInterests(data.interests),
    // NOT NULL default true in the DB, so this is always a real boolean;
    // coerce defensively in case of a legacy null.
    discoverable: (data.discoverable as boolean | null) ?? true,
  };
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
      "id, host_id, requester_name, requester_email, requester_topic, requested_kind, preferred_time, status, created_at, expires_at, decided_at, contact_emailed_at, last_email_error",
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
      "id, host_id, requester_name, requester_email, requester_topic, requested_kind, preferred_time, status, created_at, expires_at, decided_at, contact_emailed_at, last_email_error",
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
  // v13 — interest tags, rendered as small `#tag` chips on the row.
  interests: string[];
};

// A resident with no end-date counts as "around" only while their card
// is fresh — past this window an abandoned card drops off the city page
// on its own, so the list stays a snapshot of who's here now rather than
// a permanent roster. Tune to taste.
const CITY_RESIDENT_WINDOW_DAYS = 45;

// Internal: a CityCard plus the raw updated_at used only for sorting. The
// city + browse lists share the same row-shape, presence sort, and final
// strip, so those live as helpers rather than being duplicated per query.
type SortableCityCard = CityCard & { _updatedAt: string };

function toCityCard(
  r: Record<string, unknown>,
  todayIso: string,
): SortableCityCard {
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
    interests: parseInterests(r.interests),
    _updatedAt: (r.updated_at as string | undefined) ?? "",
  };
}

// Presence-first: people leaving soon sort above residents (invite them
// before they go); among residents, most recently active first.
function byPresence(a: SortableCityCard, b: SortableCityCard): number {
  if (a.cityUntil && !b.cityUntil) return -1;
  if (!a.cityUntil && b.cityUntil) return 1;
  if (a.cityUntil && b.cityUntil) return a.cityUntil < b.cityUntil ? -1 : 1;
  return a._updatedAt < b._updatedAt ? 1 : -1;
}

function stripSort(c: SortableCityCard): CityCard {
  return {
    handle: c.handle,
    displayName: c.displayName,
    city: c.city,
    cityUntil: c.cityUntil,
    status: c.status,
    avatarUrl: c.avatarUrl,
    coffeeChatKinds: c.coffeeChatKinds,
    gender: c.gender,
    interests: c.interests,
  };
}

// Cards shown on /city/[slug]: people who are in `city` AND reachable
// (have a contact channel, so invites actually work) AND "present" —
// either a future city_until (a nomad passing through) or a recently-
// touched card (a local/regular). Opted-out (discoverable=false) and
// skeleton auto-handles are excluded. Sorted presence-first (soonest to
// leave at the top — invite them before they go), then fresh residents
// by recency. Capped so a big city can't return an unbounded list.
export async function listCityCards(slug: string): Promise<CityCard[]> {
  if (!isAuthConfigured()) return [];
  if (!slug) return [];
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
      "handle, bio, city, city_until, coffee_chat_kinds, gender, avatar_url, interests, updated_at",
    )
    // Exact match against the generated slug column (indexed).
    .eq("city_slug", slug)
    .eq("discoverable", true)
    .not("handle", "match", AUTO_HANDLE.source)
    // Multiple .or() groups AND together: must be reachable …
    .or(
      "telegram_handle.not.is.null,email_contact.not.is.null",
    )
    // … and present (future end-date OR recently active).
    .or(`city_until.gte.${todayIso},updated_at.gte.${cutoffIso}`)
    .limit(50);
  if (error) return [];

  const cards = (data ?? []).map((r) => toCityCard(r, todayIso));
  cards.sort(byPresence);
  return cards.slice(0, 30).map(stripSort);
}

// Filters for the /browse discovery page. All optional — an empty opts
// lists everyone present + reachable across all cities.
export type BrowseFilters = {
  city?: string; // city_slug exact match
  kind?: CoffeeChatKind;
  interest?: string; // normalised tag, exact array containment
  q?: string; // free-text over city / handle / status
};

// Cards for /browse: same present + reachable + discoverable gating as
// listCityCards but without the single-city constraint, plus the optional
// filters above. Presence-first sort, capped higher than a single city
// page since it spans all of them.
export async function listBrowseCards(
  filters: BrowseFilters = {},
): Promise<CityCard[]> {
  if (!isAuthConfigured()) return [];
  const supabase = await createSupabaseServer();
  const todayIso = new Date().toISOString().slice(0, 10);
  const cutoffIso = new Date(
    Date.now() - CITY_RESIDENT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  let query = supabase
    .from("profiles")
    .select(
      "handle, bio, city, city_until, coffee_chat_kinds, gender, avatar_url, interests, updated_at",
    )
    .eq("discoverable", true)
    .not("handle", "match", AUTO_HANDLE.source)
    // reachable …
    .or("telegram_handle.not.is.null,email_contact.not.is.null")
    // … and present (future end-date OR recently active).
    .or(`city_until.gte.${todayIso},updated_at.gte.${cutoffIso}`);

  if (filters.city) query = query.eq("city_slug", filters.city);
  if (filters.kind) {
    query = query.contains("coffee_chat_kinds", [filters.kind]);
  }
  if (filters.interest) {
    query = query.contains("interests", [filters.interest]);
  }
  if (filters.q) {
    // Strip PostgREST filter metacharacters before interpolating into the
    // ilike pattern so a stray comma/paren can't break out of the value.
    const safe = filters.q.replace(/[%,()*]/g, " ").trim();
    if (safe) {
      query = query.or(
        `city.ilike.%${safe}%,handle.ilike.%${safe}%,bio.ilike.%${safe}%`,
      );
    }
  }

  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .limit(120);
  if (error) return [];

  const cards = (data ?? []).map((r) => toCityCard(r, todayIso));
  cards.sort(byPresence);
  return cards.slice(0, 60).map(stripSort);
}

// A city with enough present cards to be worth surfacing on the home
// "people are around here" strip.
export type ActiveCity = { city: string; slug: string; count: number };

// A city needs at least this many present cards before it shows on the
// home strip — one lone card reads as "no one's here", same reasoning as
// SocialProof's floor. The /city page itself still lists from the first
// card; this floor only governs the home teaser.
const CITY_STRIP_MIN_CARDS = 2;

// Group the present, reachable, discoverable cards (same gating as
// listCityCards, minus the city filter) by normalised slug, busiest
// first, with no floor or cap applied. Counts come from the most-
// recently-active 500 present cards — enough at this scale; revisit with
// a SQL aggregate if the active set ever outgrows that.
async function groupActiveCities(): Promise<ActiveCity[]> {
  if (!isAuthConfigured()) return [];
  const supabase = await createSupabaseServer();
  const todayIso = new Date().toISOString().slice(0, 10);
  const cutoffIso = new Date(
    Date.now() - CITY_RESIDENT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data, error } = await supabase
    .from("profiles")
    .select("city, city_slug, updated_at")
    .not("city", "is", null)
    .eq("discoverable", true)
    .not("handle", "match", AUTO_HANDLE.source)
    .or(
      "telegram_handle.not.is.null,email_contact.not.is.null",
    )
    .or(`city_until.gte.${todayIso},updated_at.gte.${cutoffIso}`)
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) return [];

  const groups = new Map<string, { city: string; count: number }>();
  for (const r of data ?? []) {
    const city = (r.city as string | null) ?? null;
    const slug = (r.city_slug as string | null) ?? null;
    if (!city || !slug) continue;
    const g = groups.get(slug);
    if (g) g.count += 1;
    else groups.set(slug, { city, count: 1 });
  }

  return [...groups.entries()]
    .map(([slug, g]) => ({ city: g.city, slug, count: g.count }))
    .sort((a, b) => b.count - a.count);
}

// Cities to feature on the home strip: busiest first, only those past the
// home floor (a lone card reads as "no one's here").
export async function listActiveCities(limit = 8): Promise<ActiveCity[]> {
  const cities = await groupActiveCities();
  return cities.filter((c) => c.count >= CITY_STRIP_MIN_CARDS).slice(0, limit);
}

// Cities crawlable enough to belong in the sitemap — same floor the city
// page uses to decide noindex, so the sitemap never lists a page that
// tells Google not to index it.
export async function listIndexableCities(): Promise<ActiveCity[]> {
  const cities = await groupActiveCities();
  return cities.filter((c) => c.count >= CITY_INDEX_FLOOR);
}

// An interest tag with enough present cards to be worth offering as a
// /browse filter chip.
export type ActiveInterest = { interest: string; count: number };

// Tally interests across the present, reachable, discoverable set (same
// gating as groupActiveCities) so the browse page can offer the busiest
// tags as filter chips. Counts come from the most-recently-active 500
// present cards — enough at this scale; revisit with a SQL aggregate /
// unnest if the active set outgrows that.
export async function listActiveInterests(
  limit = 24,
): Promise<ActiveInterest[]> {
  if (!isAuthConfigured()) return [];
  const supabase = await createSupabaseServer();
  const todayIso = new Date().toISOString().slice(0, 10);
  const cutoffIso = new Date(
    Date.now() - CITY_RESIDENT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data, error } = await supabase
    .from("profiles")
    .select("interests")
    .eq("discoverable", true)
    .not("handle", "match", AUTO_HANDLE.source)
    .or("telegram_handle.not.is.null,email_contact.not.is.null")
    .or(`city_until.gte.${todayIso},updated_at.gte.${cutoffIso}`)
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) return [];

  const counts = new Map<string, number>();
  for (const r of data ?? []) {
    for (const tag of parseInterests(r.interests)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([interest, count]) => ({ interest, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
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
  };
}
