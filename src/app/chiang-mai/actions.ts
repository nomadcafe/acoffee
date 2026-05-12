"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { checkRateLimit, ipFromHeaders } from "@/lib/rate-limit";
import { addCafe, listCafesNear, maybePromoteCafe } from "@/lib/store";
import { createSupabaseServer, isAuthConfigured } from "@/lib/supabase/server";
import type { Cafe } from "@/lib/types";

const CHECKIN_TTL_HOURS = 2;
const SNAP_RADIUS_KM = 0.03; // 30m — auto-attach to a known café this close
const NEARBY_RADIUS_KM = 0.5; // list any café within 500m as a pick option
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const CoordsSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  city: z.string().min(1).max(40),
});

const QuickCheckinSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("existing"), cafeId: z.string().uuid() }),
  z.object({
    kind: z.literal("new"),
    name: z.string().min(2).max(80),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    city: z.string().min(1).max(40),
    neighborhood: z.string().max(60).optional(),
  }),
]);

export type NearbyResult = {
  cafes: Array<Cafe & { distanceKm: number }>;
  snapTarget: (Cafe & { distanceKm: number }) | null;
};

export async function findNearbyCafes(
  input: z.infer<typeof CoordsSchema>,
): Promise<NearbyResult> {
  const parsed = CoordsSchema.safeParse(input);
  if (!parsed.success) return { cafes: [], snapTarget: null };
  const cafes = await listCafesNear({
    lat: parsed.data.lat,
    lng: parsed.data.lng,
    radiusKm: NEARBY_RADIUS_KM,
    city: parsed.data.city,
    limit: 5,
  });
  const snapTarget =
    cafes[0] && cafes[0].distanceKm <= SNAP_RADIUS_KM ? cafes[0] : null;
  return { cafes, snapTarget };
}

export type QuickCheckinResult =
  | { ok: true; slug: string; created: boolean }
  | { ok: false; message: string };

export async function quickCheckin(
  input: z.infer<typeof QuickCheckinSchema>,
): Promise<QuickCheckinResult> {
  if (!isAuthConfigured()) {
    return { ok: false, message: "Sign-in isn't configured yet." };
  }
  const parsed = QuickCheckinSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Invalid check-in input." };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sign in to check in." };

  let cafeId: string;
  let slug: string;
  let created = false;

  if (parsed.data.kind === "existing") {
    cafeId = parsed.data.cafeId;
    const { data: cafe, error } = await supabase
      .from("cafes")
      .select("slug")
      .eq("id", cafeId)
      .maybeSingle();
    if (error || !cafe) {
      return { ok: false, message: "Café not found." };
    }
    slug = cafe.slug as string;
  } else {
    // Defensive snap: if a known café is now within 30m of submitted coords,
    // attach to it instead of creating a duplicate. Race-safe against another
    // user adding the same place a moment earlier.
    const { snapTarget } = await findNearbyCafes({
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      city: parsed.data.city,
    });
    if (snapTarget) {
      cafeId = snapTarget.id;
      slug = snapTarget.slug;
    } else {
      // Rate-limit the no-snap path only — picking an existing café doesn't
      // create new rows, just a check-in. Keyed by IP so a single spammer
      // can't sidestep with multiple accounts.
      const ip = ipFromHeaders(await headers());
      const limit = checkRateLimit(`cafes:${ip}`, [
        { windowMs: HOUR_MS, max: 2 },
        { windowMs: DAY_MS, max: 5 },
      ]);
      if (!limit.allowed) {
        return {
          ok: false,
          message: `You've added a lot of new spots recently — try again in ${Math.ceil(limit.retryAfterSec / 60)} min.`,
        };
      }

      const cafe = await addCafe({
        name: parsed.data.name.trim(),
        city: parsed.data.city,
        neighborhood: parsed.data.neighborhood?.trim() || null,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        submittedBy: user.id,
      });
      cafeId = cafe.id;
      slug = cafe.slug;
      created = true;
    }
  }

  // Idempotent: skip if already active here.
  const { data: existing } = await supabase
    .from("checkins")
    .select("id")
    .eq("profile_id", user.id)
    .eq("cafe_id", cafeId)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (!existing) {
    const expiresAt = new Date(
      Date.now() + CHECKIN_TTL_HOURS * 60 * 60 * 1000,
    ).toISOString();
    const { error } = await supabase
      .from("checkins")
      .insert({ profile_id: user.id, cafe_id: cafeId, expires_at: expiresAt });
    if (error) return { ok: false, message: error.message };
  }

  // Newly-created cafés start as 'pending' with 1 check-in (the submitter),
  // so this is a no-op for them until 2 more distinct users check in. Existing
  // pending cafés get a chance to promote on every check-in.
  await maybePromoteCafe(cafeId);

  revalidatePath("/chiang-mai", "layout");
  return { ok: true, slug, created };
}
