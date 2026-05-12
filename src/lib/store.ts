import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { Cafe, CafeSubmissionStatus, Pin, Subscriber } from "./types";
import { buildSeedPins, seedCafes } from "./seed-data";

// User-submitted cafés are visible immediately with a "newly added" badge.
// Moderators can flip pending → approved (verified) or rejected (hidden).
const PUBLIC_CAFE_STATUSES: CafeSubmissionStatus[] = ["approved", "pending"];

// Distinct users needed for a pending café to auto-promote to approved.
// 3 is the smallest number that prevents a single account from self-promoting
// while still being reachable in a real café over a day or two of foot traffic.
const PROMOTION_THRESHOLD = 3;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: SupabaseClient | null = null;
if (url && serviceKey) {
  supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
}

type MemDB = { pins: Pin[]; subscribers: Subscriber[]; cafes: Cafe[] };
const g = globalThis as unknown as { __nm_db?: MemDB };
const mem: MemDB = (g.__nm_db ??= { pins: [], subscribers: [], cafes: [] });

// In dev / no-Supabase mode, seed the map so it's not empty on cold boot.
// Seeds are spread over the past ~30 days so the 24h filter shows ~ a few.
if (!supabase && mem.pins.length === 0) {
  const seeds = buildSeedPins();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  seeds.forEach((s, i) => {
    const ageDays = (i % 30) + Math.random() * 0.9;
    mem.pins.push({
      id: randomUUID(),
      lat: s.lat,
      lng: s.lng,
      nickname: s.nickname,
      createdAt: new Date(now - ageDays * day).toISOString(),
    });
  });
}

// Same idea for cafés. Phase 1 full seed lives in supabase/seed_chiang_mai_cafes.sql.
if (!supabase && mem.cafes.length === 0) {
  for (const c of seedCafes) {
    mem.cafes.push({ id: randomUUID(), ...c, submissionStatus: "approved" });
  }
}

export type Bbox = {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
};

export async function listPins(
  options: { limit?: number; bbox?: Bbox } = {},
): Promise<Pin[]> {
  const limit = options.limit ?? 500;
  const { bbox } = options;

  if (supabase) {
    let q = supabase
      .from("pins")
      .select("id, lat, lng, nickname, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (bbox) {
      q = q
        .gte("lat", bbox.minLat)
        .lte("lat", bbox.maxLat)
        .gte("lng", bbox.minLng)
        .lte("lng", bbox.maxLng);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id as string,
      lat: r.lat as number,
      lng: r.lng as number,
      nickname: (r.nickname as string | null) ?? null,
      createdAt: r.created_at as string,
    }));
  }

  let pins = mem.pins;
  if (bbox) {
    pins = pins.filter(
      (p) =>
        p.lat >= bbox.minLat &&
        p.lat <= bbox.maxLat &&
        p.lng >= bbox.minLng &&
        p.lng <= bbox.maxLng,
    );
  }
  return pins.slice(-limit).reverse();
}

// Global pin count + last-24h subset. Powers the home-page stats strip
// above the world map ("247 nomads · 23 in 24h"). Unbounded by bbox so the
// number is honest about the global community, not just covered cities.
export async function countPinsGlobal(): Promise<{
  total: number;
  last24h: number;
}> {
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  if (supabase) {
    const [totalRes, recentRes] = await Promise.all([
      supabase.from("pins").select("id", { count: "exact", head: true }),
      supabase
        .from("pins")
        .select("id", { count: "exact", head: true })
        .gte("created_at", cutoff24h),
    ]);
    if (totalRes.error) throw totalRes.error;
    if (recentRes.error) throw recentRes.error;
    return {
      total: totalRes.count ?? 0,
      last24h: recentRes.count ?? 0,
    };
  }
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return {
    total: mem.pins.length,
    last24h: mem.pins.filter((p) => new Date(p.createdAt).getTime() >= cutoff)
      .length,
  };
}

// Count pins inside a bbox. Used by the home page's "cities right now"
// strip to rank cities by recent activity without any reverse-geocoding —
// the bbox per city is hard-coded in lib/cities.
export async function countPinsInBbox(input: {
  bbox: { minLat: number; minLng: number; maxLat: number; maxLng: number };
  sinceDays?: number;
}): Promise<{ total: number; last24h: number }> {
  const sinceDays = input.sinceDays ?? 30;
  const cutoffWindow = new Date(
    Date.now() - sinceDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  if (supabase) {
    const bboxFiltered = (cutoff: string) =>
      supabase!
        .from("pins")
        .select("id", { count: "exact", head: true })
        .gte("lat", input.bbox.minLat)
        .lte("lat", input.bbox.maxLat)
        .gte("lng", input.bbox.minLng)
        .lte("lng", input.bbox.maxLng)
        .gte("created_at", cutoff);

    const [totalRes, recentRes] = await Promise.all([
      bboxFiltered(cutoffWindow),
      bboxFiltered(cutoff24h),
    ]);
    if (totalRes.error) throw totalRes.error;
    if (recentRes.error) throw recentRes.error;
    return {
      total: totalRes.count ?? 0,
      last24h: recentRes.count ?? 0,
    };
  }

  const inBbox = mem.pins.filter(
    (p) =>
      p.lat >= input.bbox.minLat &&
      p.lat <= input.bbox.maxLat &&
      p.lng >= input.bbox.minLng &&
      p.lng <= input.bbox.maxLng,
  );
  const windowMs = sinceDays * 24 * 60 * 60 * 1000;
  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const total = inBbox.filter(
    (p) => now - new Date(p.createdAt).getTime() <= windowMs,
  ).length;
  const last24h = inBbox.filter(
    (p) => now - new Date(p.createdAt).getTime() <= day,
  ).length;
  return { total, last24h };
}

export async function addPin(input: {
  lat: number;
  lng: number;
  nickname: string | null;
  ip: string | null;
}): Promise<Pin> {
  if (supabase) {
    const { data, error } = await supabase
      .from("pins")
      .insert({
        lat: input.lat,
        lng: input.lng,
        nickname: input.nickname,
        ip: input.ip,
      })
      .select("id, lat, lng, nickname, created_at")
      .single();
    if (error) throw error;
    return {
      id: data.id as string,
      lat: data.lat as number,
      lng: data.lng as number,
      nickname: (data.nickname as string | null) ?? null,
      createdAt: data.created_at as string,
    };
  }
  const pin: Pin = {
    id: randomUUID(),
    lat: input.lat,
    lng: input.lng,
    nickname: input.nickname,
    createdAt: new Date().toISOString(),
  };
  mem.pins.push(pin);
  return pin;
}

export async function addSubscriber(input: {
  email: string;
  city: string | null;
}): Promise<{ ok: true; duplicate: boolean }> {
  if (supabase) {
    const { error } = await supabase
      .from("subscribers")
      .insert({ email: input.email, city: input.city });
    if (error) {
      if (error.code === "23505") return { ok: true, duplicate: true };
      throw error;
    }
    return { ok: true, duplicate: false };
  }
  if (mem.subscribers.some((s) => s.email === input.email)) {
    return { ok: true, duplicate: true };
  }
  mem.subscribers.push({
    id: randomUUID(),
    email: input.email,
    city: input.city,
    createdAt: new Date().toISOString(),
  });
  return { ok: true, duplicate: false };
}

const CAFE_FIELDS =
  "id, slug, name, city, neighborhood, lat, lng, has_wifi, has_outlets, laptop_friendly, submission_status";

type CafeRow = {
  id: string;
  slug: string;
  name: string;
  city: string;
  neighborhood: string | null;
  lat: number;
  lng: number;
  has_wifi: boolean;
  has_outlets: boolean;
  laptop_friendly: boolean;
  submission_status: CafeSubmissionStatus;
};

function rowToCafe(r: CafeRow): Cafe {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    city: r.city,
    neighborhood: r.neighborhood ?? null,
    lat: r.lat,
    lng: r.lng,
    hasWifi: r.has_wifi,
    hasOutlets: r.has_outlets,
    laptopFriendly: r.laptop_friendly,
    submissionStatus: r.submission_status,
  };
}

export async function listCafes(
  options: { city?: string; limit?: number } = {},
): Promise<Cafe[]> {
  const limit = options.limit ?? 100;
  const { city } = options;

  if (supabase) {
    let q = supabase
      .from("cafes")
      .select(CAFE_FIELDS)
      .in("submission_status", PUBLIC_CAFE_STATUSES)
      .order("name", { ascending: true })
      .limit(limit);
    if (city) q = q.eq("city", city);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r) => rowToCafe(r as CafeRow));
  }

  let cafes = mem.cafes;
  if (city) cafes = cafes.filter((c) => c.city === city);
  return cafes.slice(0, limit);
}

export async function getCafeBySlug(slug: string): Promise<Cafe | null> {
  if (supabase) {
    const { data, error } = await supabase
      .from("cafes")
      .select(CAFE_FIELDS)
      .eq("slug", slug)
      .in("submission_status", PUBLIC_CAFE_STATUSES)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return rowToCafe(data as CafeRow);
  }
  return mem.cafes.find((c) => c.slug === slug) ?? null;
}

// Find approved + pending cafés within roughly `radiusKm` of a point. Bounding
// box prefilter on lat/lng, then haversine refine in JS — cheap for the city
// scale we care about (≤ a few hundred per city).
export async function listCafesNear(input: {
  lat: number;
  lng: number;
  radiusKm: number;
  city?: string;
  limit?: number;
}): Promise<Array<Cafe & { distanceKm: number }>> {
  const { lat, lng, radiusKm, city } = input;
  const limit = input.limit ?? 5;

  const degLat = radiusKm / 111;
  const degLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);

  let cafes: Cafe[];
  if (supabase) {
    let q = supabase
      .from("cafes")
      .select(CAFE_FIELDS)
      .in("submission_status", PUBLIC_CAFE_STATUSES)
      .gte("lat", lat - degLat)
      .lte("lat", lat + degLat)
      .gte("lng", lng - degLng)
      .lte("lng", lng + degLng);
    if (city) q = q.eq("city", city);
    const { data, error } = await q;
    if (error) throw error;
    cafes = (data ?? []).map((r) => rowToCafe(r as CafeRow));
  } else {
    cafes = mem.cafes.filter(
      (c) =>
        (!city || c.city === city) &&
        c.lat >= lat - degLat &&
        c.lat <= lat + degLat &&
        c.lng >= lng - degLng &&
        c.lng <= lng + degLng,
    );
  }

  return cafes
    .map((cafe) => ({
      ...cafe,
      distanceKm: haversineKm(lat, lng, cafe.lat, cafe.lng),
    }))
    .filter((c) => c.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 60) || "cafe";
}

export async function addCafe(input: {
  name: string;
  city: string;
  neighborhood: string | null;
  lat: number;
  lng: number;
  submittedBy: string | null;
}): Promise<Cafe> {
  const baseSlug = slugify(input.name);
  // Try base slug; if taken, append 2..9 then a short uuid suffix.
  const candidates = [
    baseSlug,
    ...Array.from({ length: 8 }, (_, i) => `${baseSlug}-${i + 2}`),
    `${baseSlug}-${randomUUID().slice(0, 6)}`,
  ];

  if (supabase) {
    for (const slug of candidates) {
      const { data, error } = await supabase
        .from("cafes")
        .insert({
          slug,
          name: input.name,
          city: input.city,
          neighborhood: input.neighborhood,
          lat: input.lat,
          lng: input.lng,
          submitted_by: input.submittedBy,
          submission_status: "pending",
        })
        .select(CAFE_FIELDS)
        .single();
      if (!error && data) return rowToCafe(data as CafeRow);
      if (error?.code !== "23505") throw error; // not a unique-violation → rethrow
    }
    throw new Error("Could not generate a unique café slug.");
  }

  // In-memory fallback for dev: just pick the first available slug.
  for (const slug of candidates) {
    if (mem.cafes.some((c) => c.slug === slug)) continue;
    const cafe: Cafe = {
      id: randomUUID(),
      slug,
      name: input.name,
      city: input.city,
      neighborhood: input.neighborhood,
      lat: input.lat,
      lng: input.lng,
      hasWifi: true,
      hasOutlets: false,
      laptopFriendly: false,
      submissionStatus: "pending",
    };
    mem.cafes.push(cafe);
    return cafe;
  }
  throw new Error("Could not generate a unique café slug.");
}

// Reveal a profile's email — only call after verifying the viewer is a
// legitimate party (e.g. an accepted intent match). Service-role bypasses
// RLS; the gate must live in the caller.
export async function lookupEmail(profileId: string): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.auth.admin.getUserById(profileId);
    if (error) return null;
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

export async function countActiveIntents(city: string): Promise<number> {
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("intents")
    .select("id", { count: "exact", head: true })
    .eq("city", city)
    .gt("expires_at", new Date().toISOString());
  if (error) throw error;
  return count ?? 0;
}

// Auto-promote a pending café once enough distinct users have checked in.
// Counts ALL check-ins (active + expired), so promotion accumulates over time
// even if individual sessions have already ended. Race-safe: the UPDATE only
// fires when status is still 'pending', so two concurrent calls won't double-flip.
export async function maybePromoteCafe(cafeId: string): Promise<boolean> {
  if (!supabase) return false;

  const { data: cafe } = await supabase
    .from("cafes")
    .select("submission_status")
    .eq("id", cafeId)
    .maybeSingle();
  if (!cafe || cafe.submission_status !== "pending") return false;

  const { data: rows, error } = await supabase
    .from("checkins")
    .select("profile_id")
    .eq("cafe_id", cafeId);
  if (error) return false;

  const distinctUsers = new Set(
    (rows ?? []).map((r) => r.profile_id as string),
  );
  if (distinctUsers.size < PROMOTION_THRESHOLD) return false;

  const { error: updateErr } = await supabase
    .from("cafes")
    .update({ submission_status: "approved" })
    .eq("id", cafeId)
    .eq("submission_status", "pending");
  return !updateErr;
}

// Roster of who's currently checked in at a specific café. The auth-queries
// wrapper gates exposure: only people who are ALSO in this roster can see it.
// Service-role here so the join works without RLS friction; the actual
// reveal logic lives in lib/auth-queries.ts.
//
// Each entry is enriched with the user's active intent kind (if any) so
// the roster can show "@alex · ☕ Coffee · here 25m" — a stronger icebreaker
// signal than the handle alone.
export type ActiveCheckinAtCafe = {
  id: string;
  profileId: string;
  handle: string;
  note: string | null;
  createdAt: string;
  expiresAt: string;
  // Active intent of this checked-in user, if any. The auth-queries wrapper
  // adds the viewer's response status so the UI can render one-click respond.
  intent: {
    id: string;
    kind: import("./types").IntentKind;
    expiresAt: string;
  } | null;
};

export async function listActiveCheckinsAtCafe(
  cafeId: string,
): Promise<ActiveCheckinAtCafe[]> {
  if (!supabase) return [];
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("checkins")
    .select(
      "id, profile_id, note, created_at, expires_at, profile:profiles!inner(handle)",
    )
    .eq("cafe_id", cafeId)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = data ?? [];
  if (rows.length === 0) return [];

  const profileIds = rows.map((r) => r.profile_id as string);
  const { data: intentRows } = await supabase
    .from("intents")
    .select("id, profile_id, kind, expires_at")
    .in("profile_id", profileIds)
    .gt("expires_at", nowIso);
  const intentByProfile = new Map<
    string,
    { id: string; kind: import("./types").IntentKind; expiresAt: string }
  >(
    (intentRows ?? []).map((i) => [
      i.profile_id as string,
      {
        id: i.id as string,
        kind: i.kind as import("./types").IntentKind,
        expiresAt: i.expires_at as string,
      },
    ]),
  );

  return rows.map((r) => {
    const profile = (Array.isArray(r.profile) ? r.profile[0] : r.profile) as
      | { handle?: string }
      | undefined;
    return {
      id: r.id as string,
      profileId: r.profile_id as string,
      handle: profile?.handle ?? "unknown",
      note: (r.note as string | null) ?? null,
      createdAt: r.created_at as string,
      expiresAt: r.expires_at as string,
      intent: intentByProfile.get(r.profile_id as string) ?? null,
    };
  });
}

export async function countActiveCheckins(cafeId: string): Promise<number> {
  if (!supabase) return devSyntheticCount(cafeId);
  const { count, error } = await supabase
    .from("checkins")
    .select("id", { count: "exact", head: true })
    .eq("cafe_id", cafeId)
    .gt("expires_at", new Date().toISOString());
  if (error) throw error;
  return count ?? 0;
}

// Deterministic fake activity for the no-Supabase dev path so the UI has
// something to render. ~1/3 of cafés get a small non-zero count, stable per id.
function devSyntheticCount(cafeId: string): number {
  let h = 0;
  for (let i = 0; i < cafeId.length; i++) h = (h * 31 + cafeId.charCodeAt(i)) | 0;
  const m = ((h % 13) + 13) % 13;
  if (m === 0) return 5;
  if (m <= 3) return m;
  return 0;
}

export async function listActiveCheckinCounts(
  cafeIds: string[],
): Promise<Record<string, number>> {
  if (cafeIds.length === 0) return {};
  if (!supabase) {
    const out: Record<string, number> = {};
    for (const id of cafeIds) {
      const n = devSyntheticCount(id);
      if (n > 0) out[id] = n;
    }
    return out;
  }
  const { data, error } = await supabase
    .from("checkins")
    .select("cafe_id")
    .gt("expires_at", new Date().toISOString())
    .in("cafe_id", cafeIds);
  if (error) throw error;
  const out: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = row.cafe_id as string;
    out[id] = (out[id] ?? 0) + 1;
  }
  return out;
}

// Recent check-in feed — used by the city page's "Latest activity" strip to
// give signed-in users a sense of motion. Returns most-recent-first across
// all checkins for a city (regardless of expiry — we want to see what
// happened, not just what's still live).
export type RecentCheckin = {
  handle: string;
  cafeName: string;
  cafeSlug: string;
  createdAt: string;
};

export async function listRecentCheckins(
  city: string,
  limit: number,
): Promise<RecentCheckin[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("checkins")
    .select(
      "created_at, cafe:cafes!inner(name, slug, city), profile:profiles!inner(handle)",
    )
    .eq("cafe.city", city)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (data ?? []).map((r) => {
    const cafeRaw = (r as { cafe?: unknown }).cafe;
    const cafe = (Array.isArray(cafeRaw) ? cafeRaw[0] : cafeRaw) as
      | { name?: string; slug?: string }
      | undefined;
    const profileRaw = (r as { profile?: unknown }).profile;
    const profile = (Array.isArray(profileRaw) ? profileRaw[0] : profileRaw) as
      | { handle?: string }
      | undefined;
    return {
      handle: profile?.handle ?? "unknown",
      cafeName: cafe?.name ?? "a café",
      cafeSlug: cafe?.slug ?? "",
      createdAt: r.created_at as string,
    };
  });
}

export async function listTopActiveCafes(
  city: string,
  limit: number,
): Promise<Array<{ cafe: Cafe; activeCount: number }>> {
  const cafes = await listCafes({ city });
  const counts = await listActiveCheckinCounts(cafes.map((c) => c.id));
  return cafes
    .map((cafe) => ({ cafe, activeCount: counts[cafe.id] ?? 0 }))
    .filter((x) => x.activeCount > 0)
    .sort((a, b) => b.activeCount - a.activeCount)
    .slice(0, limit);
}

// Sitemap-shaped entries — mirrors public visibility (approved + pending)
// so what's crawlable matches what visitors see, with createdAt for accurate
// lastModified hints and status for priority scaling.
export type CafeSitemapEntry = {
  slug: string;
  status: CafeSubmissionStatus;
  createdAt: string;
};

export async function listCafeSitemapEntries(
  city?: string,
): Promise<CafeSitemapEntry[]> {
  if (supabase) {
    let q = supabase
      .from("cafes")
      .select("slug, submission_status, created_at")
      .in("submission_status", PUBLIC_CAFE_STATUSES);
    if (city) q = q.eq("city", city);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r) => ({
      slug: r.slug as string,
      status: r.submission_status as CafeSubmissionStatus,
      createdAt: r.created_at as string,
    }));
  }
  return mem.cafes
    .filter((c) => !city || c.city === city)
    .map((c) => ({
      slug: c.slug,
      status: c.submissionStatus,
      // In-memory cafés don't track createdAt; use process start as a stable
      // proxy. Doesn't really matter outside production.
      createdAt: new Date().toISOString(),
    }));
}

export function isUsingSupabase() {
  return supabase !== null;
}
