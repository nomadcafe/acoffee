"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { emailInviteConfirm, emailNewInvite } from "@/lib/email";
import { getLocale } from "@/lib/i18n";
import { type Locale } from "@/lib/i18n/dict";
import { deriveDisplayName } from "@/lib/profile";
import { checkRateLimit, ipFromHeaders } from "@/lib/rate-limit";
import {
  createSupabaseAdmin,
  createSupabaseServer,
  isAuthConfigured,
} from "@/lib/supabase/server";
import { COFFEE_CHAT_KINDS, type CoffeeChatKind } from "@/lib/types";

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
  requestedKind: z.enum(COFFEE_CHAT_KINDS),
  preferredTime: z
    .string()
    .max(80, "Time hint is at most 80 characters.")
    .optional(),
});

export type CreateInviteState =
  | { status: "idle" }
  // `needsConfirm: false` means the visitor was a signed-in acoffee user
  // whose auth email matched the submitted email, so we skipped the AA2
  // confirm round-trip and pushed straight to the host. The form uses
  // this to render the right success copy.
  | { status: "sent"; needsConfirm: boolean }
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
    requestedKind: trimOrUndefined(formData.get("requestedKind")),
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

  // Check if the visitor is a signed-in acoffee user whose auth email
  // matches the email they typed. If so, we trust the address (Supabase
  // verified it during signup) and skip the AA2 confirm round-trip —
  // status=pending immediately, host email fires here. Anonymous
  // visitors still go through the original confirm flow.
  const supabase = await createSupabaseServer();
  const {
    data: { user: visitor },
  } = await supabase.auth.getUser();
  const visitorEmail = visitor?.email?.toLowerCase() ?? null;
  const skipConfirm =
    !!visitor &&
    !!visitorEmail &&
    visitorEmail === parsed.data.requesterEmail.toLowerCase();

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

  // Block a signed-in user from inviting themselves — silly + would
  // pollute their own inbox. Anonymous visitors can't trigger this
  // because we wouldn't know the visitor identity.
  if (visitor && visitor.id === hostId) {
    return { status: "error", message: "You can't invite yourself." };
  }

  // Snapshot the visitor's locale on the row — the host's accept/decline
  // happens later and the cookie/header chain is gone by then. Without
  // this, follow-up emails to the visitor would fall back to English
  // even if they submitted in zh/ja.
  const locale = await getLocale();
  // For the AA2 path: random token powering the confirm link emailed to
  // the visitor. crypto.randomUUID is unguessable enough; the unique
  // index on confirm_token doubles as the lookup path. For the
  // skip-confirm path: null + status='pending' goes straight through.
  const confirmToken = skipConfirm ? null : crypto.randomUUID();
  const { error: insertErr } = await admin.from("invites").insert({
    host_id: hostId,
    requester_name: parsed.data.requesterName,
    requester_email: parsed.data.requesterEmail,
    requester_topic: parsed.data.requesterTopic,
    requested_kind: parsed.data.requestedKind,
    preferred_time: parsed.data.preferredTime ?? null,
    requester_locale: locale,
    status: skipConfirm ? "pending" : "unconfirmed",
    confirm_token: confirmToken,
    confirmed_at: skipConfirm ? new Date().toISOString() : null,
  });
  if (insertErr) {
    return {
      status: "error",
      message: `Couldn't save the invite: ${insertErr.message}`,
    };
  }

  const hostDisplayName = deriveDisplayName(hostHandle);
  if (skipConfirm) {
    // Signed-in path: fire the host notification immediately. Mirrors
    // the work the confirm route does after a visitor clicks their
    // confirm link, just inlined here because there's no link to send.
    const { data: hostAuth } = await admin.auth.admin.getUserById(hostId);
    const hostNotifyEmail = hostAuth.user?.email ?? null;
    const { data: hostProfile } = await admin
      .from("profiles")
      .select("locale")
      .eq("id", hostId)
      .maybeSingle();
    const hostLocaleRaw = hostProfile?.locale as string | null | undefined;
    const hostLocale: Locale =
      hostLocaleRaw === "zh" || hostLocaleRaw === "ja"
        ? hostLocaleRaw
        : "en";
    if (hostNotifyEmail) {
      await emailNewInvite({
        to: hostNotifyEmail,
        hostHandle,
        requesterName: parsed.data.requesterName,
        requesterEmail: parsed.data.requesterEmail,
        requesterTopic: parsed.data.requesterTopic,
        kind: parsed.data.requestedKind as CoffeeChatKind,
        preferredTime: parsed.data.preferredTime ?? null,
        locale: hostLocale,
      });
    }
  } else {
    // AA2 anti-spam: the host is NOT notified here. Visitor must click
    // the confirm link in this email first; that promotes the row to
    // `pending` and triggers emailNewInvite to the host. Fake emails
    // bounce here without disturbing anyone.
    await emailInviteConfirm({
      to: parsed.data.requesterEmail,
      requesterName: parsed.data.requesterName,
      hostDisplayName,
      hostHandle,
      // confirmToken is non-null on the AA2 branch by construction.
      confirmToken: confirmToken!,
      locale,
    });
  }

  // Revalidate the host's profile so the new pending invite shows up in
  // their inbox on next visit. Tag-style invalidation would be cleaner
  // but path-based revalidation is enough at this scale.
  revalidatePath("/profile");

  return { status: "sent", needsConfirm: !skipConfirm };
}
