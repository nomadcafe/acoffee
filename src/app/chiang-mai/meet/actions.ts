"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { computeIntentExpiry } from "@/lib/intent-ttl";
import { createSupabaseServer, isAuthConfigured } from "@/lib/supabase/server";

const SetIntentSchema = z.object({
  kind: z.enum(["coffee", "cowork", "dinner", "hike"]),
  city: z.string().min(1),
});

// setIntent atomically replaces the user's active intent: drops the old
// (which cascades to its incoming responses) and inserts a fresh one.
// Switching intent kinds (coffee → dinner) is a different ask, so clearing
// pending responses is intentional.
export async function setIntent(formData: FormData): Promise<void> {
  if (!isAuthConfigured()) return;
  const parsed = SetIntentSchema.safeParse({
    kind: formData.get("kind"),
    city: formData.get("city"),
  });
  if (!parsed.success) return;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("intents").delete().eq("profile_id", user.id);

  const expiresAt = computeIntentExpiry(
    parsed.data.kind,
    parsed.data.city,
  ).toISOString();
  await supabase.from("intents").insert({
    profile_id: user.id,
    kind: parsed.data.kind,
    city: parsed.data.city,
    expires_at: expiresAt,
  });

  // setIntent may be triggered from /meet OR from a café detail page; revalidate
  // the whole /chiang-mai subtree so both reflect the new intent immediately.
  revalidatePath("/chiang-mai", "layout");
}

export async function clearIntent(): Promise<void> {
  if (!isAuthConfigured()) return;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("intents").delete().eq("profile_id", user.id);
  revalidatePath("/chiang-mai/meet");
}

export async function respondToIntent(formData: FormData): Promise<void> {
  if (!isAuthConfigured()) return;
  const intentId = formData.get("intentId");
  if (typeof intentId !== "string" || !intentId) return;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("intent_responses")
    .select("id")
    .eq("intent_id", intentId)
    .eq("responder_id", user.id)
    .maybeSingle();
  if (existing) {
    revalidatePath("/chiang-mai/meet");
    return;
  }

  await supabase.from("intent_responses").insert({
    intent_id: intentId,
    responder_id: user.id,
    status: "pending",
  });
  // Roster on café pages also surfaces respond state, so broaden the
  // revalidate scope to cover both /meet and /cafes/[slug].
  revalidatePath("/chiang-mai", "layout");
}

// No DELETE policy on intent_responses; withdrawing is just UPDATE → declined.
// Either party can call this (responder withdraws OR owner declines).
export async function declineResponse(formData: FormData): Promise<void> {
  if (!isAuthConfigured()) return;
  const responseId = formData.get("responseId");
  if (typeof responseId !== "string" || !responseId) return;
  const supabase = await createSupabaseServer();
  await supabase
    .from("intent_responses")
    .update({ status: "declined" })
    .eq("id", responseId);
  // Café roster also surfaces response state — broaden the revalidate scope.
  revalidatePath("/chiang-mai", "layout");
}

// Owner accepts ONE response; the others on the same intent are auto-declined.
// 1:1 matching for MVP (vision §4 "对方一键接受/拒绝" semantics).
export async function acceptResponse(formData: FormData): Promise<void> {
  if (!isAuthConfigured()) return;
  const responseId = formData.get("responseId");
  const intentId = formData.get("intentId");
  if (
    typeof responseId !== "string" || !responseId ||
    typeof intentId !== "string" || !intentId
  ) {
    return;
  }
  const supabase = await createSupabaseServer();
  await supabase
    .from("intent_responses")
    .update({ status: "accepted" })
    .eq("id", responseId);
  await supabase
    .from("intent_responses")
    .update({ status: "declined" })
    .eq("intent_id", intentId)
    .neq("id", responseId)
    .eq("status", "pending");
  revalidatePath("/chiang-mai", "layout");
}
