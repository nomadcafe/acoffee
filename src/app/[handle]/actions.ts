"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { emailInviteReceived, emailNewInvite } from "@/lib/email";
import { getLocale } from "@/lib/i18n";
import { checkRateLimit, ipFromHeaders } from "@/lib/rate-limit";
import { createSupabaseAdmin, isAuthConfigured } from "@/lib/supabase/server";
import { INVITE_MODES } from "@/lib/types";

// Visitor-side action backing the InviteForm on /[handle]. No auth required
// — visitors don't have accounts. The server is the gateway: validates the
// payload, rate-limits per IP, looks up the host by handle, inserts the
// row via the service-role client (RLS allows public insert anyway but
// admin keeps the path predictable), then emails the host.

const InviteSchema = z.object({
  handle: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[a-z0-9_]+$/),
  requesterName: z
    .string()
    .min(1, "What should we call you?")
    .max(60, "Name is at most 60 characters."),
  requesterEmail: z
    .string()
    .email("That doesn't look like a valid email.")
    .max(120),
  requesterTopic: z
    .string()
    .min(1, "Add a line about what you'd like to chat about.")
    .max(280, "Topic is at most 280 characters."),
  mode: z.enum(INVITE_MODES),
  preferredTime: z
    .string()
    .max(80, "Time hint is at most 80 characters.")
    .optional(),
});

export type CreateInviteState =
  | { status: "idle" }
  | { status: "sent" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Partial<Record<keyof z.infer<typeof InviteSchema>, string>>;
    };

function trimOrUndefined(v: FormDataEntryValue | null): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
}

// "alex_nomad" → "Alex Nomad". Same derivation /[handle]/page.tsx +
// SiteNav use — inline because cross-importing a one-liner is overkill.
function deriveDisplayName(handle: string): string {
  return handle
    .split("_")
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
}

export async function createInvite(
  _prev: CreateInviteState,
  formData: FormData,
): Promise<CreateInviteState> {
  if (!isAuthConfigured()) {
    return {
      status: "error",
      message: "Invites aren't configured on this server.",
    };
  }

  const parsed = InviteSchema.safeParse({
    handle: trimOrUndefined(formData.get("handle")),
    requesterName: trimOrUndefined(formData.get("requesterName")),
    requesterEmail: trimOrUndefined(formData.get("requesterEmail")),
    requesterTopic: trimOrUndefined(formData.get("requesterTopic")),
    mode: trimOrUndefined(formData.get("mode")),
    preferredTime: trimOrUndefined(formData.get("preferredTime")),
  });
  if (!parsed.success) {
    const fieldErrors: NonNullable<
      Extract<CreateInviteState, { status: "error" }>["fieldErrors"]
    > = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0] as keyof z.infer<typeof InviteSchema>;
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  // Per-IP rate limit. Two windows: a short 5-min burst window prevents
  // form-replay floods, plus an hourly cap so even slow scripts can't
  // pile up. Generous enough for a small team brainstorming together not
  // to get blocked.
  const ip = ipFromHeaders(await headers());
  const limit = checkRateLimit(`invite:${ip}`, [
    { max: 3, windowMs: 5 * 60 * 1000 },
    { max: 10, windowMs: 60 * 60 * 1000 },
  ]);
  if (!limit.allowed) {
    // Surface to Vercel logs so operationally we can see if a host is
    // being targeted by an automated flood. In-memory rate-limit doesn't
    // give us a DB record to triage from later; this is the minimum
    // observability for v0.8.
    console.warn("[invite] rate-limited", {
      ip,
      handle: parsed.data.handle,
      retryAfterSec: limit.retryAfterSec,
    });
    const mins = Math.max(1, Math.ceil(limit.retryAfterSec / 60));
    return {
      status: "error",
      message: `Too many invites from this network. Try again in ${mins} min${mins === 1 ? "" : "s"}.`,
    };
  }

  // Admin client — bypasses RLS for the host lookup + insert. The public
  // INSERT policy would work too, but going through admin lets us read the
  // host's email + handle in the same query without exposing them in a
  // chatty client-side flow.
  const admin = createSupabaseAdmin();
  const { data: host, error: hostErr } = await admin
    .from("profiles")
    .select("id, handle")
    .eq("handle", parsed.data.handle.toLowerCase())
    .maybeSingle();
  if (hostErr || !host) {
    return { status: "error", message: "Card not found." };
  }
  const hostId = host.id as string;
  const hostHandle = host.handle as string;

  // Read the host's auth email (where the inbox notification lands) via
  // the admin auth API. profiles.email_contact is the *public* contact —
  // not the same thing.
  const { data: hostAuth } = await admin.auth.admin.getUserById(hostId);
  const hostNotifyEmail = hostAuth.user?.email ?? null;

  // Snapshot the visitor's locale on the row — the host's accept/decline
  // happens later and the cookie/header chain is gone by then. Without
  // this, follow-up emails to the visitor would fall back to English
  // even if they submitted in zh/ja.
  const locale = await getLocale();
  const { error: insertErr } = await admin.from("invites").insert({
    host_id: hostId,
    requester_name: parsed.data.requesterName,
    requester_email: parsed.data.requesterEmail,
    requester_topic: parsed.data.requesterTopic,
    mode: parsed.data.mode,
    preferred_time: parsed.data.preferredTime ?? null,
    requester_locale: locale,
  });
  if (insertErr) {
    return {
      status: "error",
      message: `Couldn't save the invite: ${insertErr.message}`,
    };
  }

  // Fire-and-forget — never block the visitor on Resend latency. Failures
  // land in Vercel logs via the email helper's catch.
  const hostDisplayName = deriveDisplayName(hostHandle);
  if (hostNotifyEmail) {
    await emailNewInvite({
      to: hostNotifyEmail,
      hostHandle,
      requesterName: parsed.data.requesterName,
      requesterEmail: parsed.data.requesterEmail,
      requesterTopic: parsed.data.requesterTopic,
      mode: parsed.data.mode,
      preferredTime: parsed.data.preferredTime ?? null,
    });
  }

  // Confirmation to the visitor — closes the loop ("we got your invite,
  // they'll reply or it expires in 7d"). Bonus: bad-email bounces show
  // up here instead of later when the host tries to send the contact
  // reveal to a typo.
  await emailInviteReceived({
    to: parsed.data.requesterEmail,
    requesterName: parsed.data.requesterName,
    hostDisplayName,
    hostHandle,
    locale,
  });

  // Revalidate the host's profile so the new pending invite shows up in
  // their inbox on next visit. Tag-style invalidation would be cleaner
  // but path-based revalidation is enough at this scale.
  revalidatePath("/profile");

  return { status: "sent" };
}
