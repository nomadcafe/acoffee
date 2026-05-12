"use server";

import { revalidatePath } from "next/cache";
import { maybePromoteCafe } from "@/lib/store";
import { createSupabaseServer, isAuthConfigured } from "@/lib/supabase/server";

const CHECKIN_TTL_HOURS = 2;

type Result = { ok: boolean; message?: string };

export async function checkIn(formData: FormData): Promise<Result> {
  if (!isAuthConfigured()) {
    return { ok: false, message: "Sign-in isn't configured yet." };
  }
  const cafeId = formData.get("cafeId");
  if (typeof cafeId !== "string" || !cafeId) {
    return { ok: false, message: "Missing café." };
  }
  // Optional public note shown to others on the roster. 80 char DB cap.
  const rawNote = formData.get("note");
  const note =
    typeof rawNote === "string" && rawNote.trim().length > 0
      ? rawNote.trim().slice(0, 80)
      : null;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Sign in to check in." };

  // Idempotency: if the user already has an active checkin here, update the
  // note (if changed) but don't create a duplicate row.
  const { data: existing } = await supabase
    .from("checkins")
    .select("id")
    .eq("profile_id", user.id)
    .eq("cafe_id", cafeId)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();
  if (existing) {
    if (note !== null || rawNote === "") {
      await supabase
        .from("checkins")
        .update({ note })
        .eq("id", existing.id as string);
    }
    revalidatePath("/chiang-mai/cafes/[slug]", "page");
    return { ok: true };
  }

  const expiresAt = new Date(
    Date.now() + CHECKIN_TTL_HOURS * 60 * 60 * 1000,
  ).toISOString();
  const { error } = await supabase
    .from("checkins")
    .insert({
      profile_id: user.id,
      cafe_id: cafeId,
      note,
      expires_at: expiresAt,
    });
  if (error) return { ok: false, message: error.message };

  await maybePromoteCafe(cafeId);

  revalidatePath("/chiang-mai/cafes/[slug]", "page");
  return { ok: true };
}

export async function checkOut(formData: FormData): Promise<Result> {
  if (!isAuthConfigured()) {
    return { ok: false, message: "Sign-in isn't configured yet." };
  }
  const checkinId = formData.get("checkinId");
  if (typeof checkinId !== "string" || !checkinId) {
    return { ok: false, message: "Missing check-in." };
  }

  const supabase = await createSupabaseServer();
  // RLS ensures only the owner can delete (checkins_delete_own policy).
  const { error } = await supabase.from("checkins").delete().eq("id", checkinId);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/chiang-mai/cafes/[slug]", "page");
  return { ok: true };
}
