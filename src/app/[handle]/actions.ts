"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { localDateInZone } from "@/lib/datetime";
import { emailInviteConfirm, emailNewInvite } from "@/lib/email";
import { getLocale } from "@/lib/i18n";
import { type Locale } from "@/lib/i18n/dict";
import { deriveDisplayName } from "@/lib/profile";
import { checkRateLimitDurable, ipFromHeaders } from "@/lib/rate-limit";
import { inviteCaptchaSiteKey, verifyTurnstile } from "@/lib/turnstile";
import {
  createSupabaseAdmin,
  createSupabaseServer,
  isAuthConfigured,
} from "@/lib/supabase/server";
import {
  COFFEE_CHAT_KINDS,
  PENDING_INVITE_TTL_MS,
  UNCONFIRMED_INVITE_TTL_MS,
  type CoffeeChatKind,
} from "@/lib/types";

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
  // v16 — when the host has scheduling on, the visitor picks one of their
  // slots instead of typing a time. Optional: hosts without scheduling
  // still submit the free-form preferredTime above.
  slotId: z.string().uuid().optional(),
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
    slotId: trimOrUndefined(formData.get("slotId")),
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

  // Check if the visitor is a signed-in acoffee user whose auth email
  // matches the email they typed. If so, we trust the address (Supabase
  // verified it during signup) and skip the AA2 confirm round-trip —
  // status=pending immediately, host email fires here. Anonymous
  // visitors still go through the original confirm flow.
  const ip = ipFromHeaders(await headers());
  const supabase = await createSupabaseServer();
  const {
    data: { user: visitor },
  } = await supabase.auth.getUser();
  const visitorEmail = visitor?.email?.toLowerCase() ?? null;
  const skipConfirm =
    !!visitor &&
    !!visitorEmail &&
    visitorEmail === parsed.data.requesterEmail.toLowerCase();

  // Bot gate, ahead of the rate limit on purpose — see below. Only the
  // anonymous path carries one: that's the branch that puts visitor-typed
  // text into an email addressed to a visitor-typed address, which is the
  // thing worth abusing here. A signed-in visitor's address is Supabase-
  // verified and their form has the field locked, so a challenge there
  // would be friction with nothing behind it. (A crafted POST from a
  // signed-in session with someone *else's* address doesn't skip confirm,
  // so it lands here and needs a token like any other stranger.)
  const captchaSiteKey = inviteCaptchaSiteKey();
  if (captchaSiteKey && !skipConfirm) {
    const captchaToken = trimOrUndefined(formData.get("captchaToken"));
    if (!captchaToken) {
      return {
        status: "error",
        message: "Please complete the verification and try again.",
      };
    }
    const verdict = await verifyTurnstile(captchaToken, ip);
    if (!verdict.ok) {
      console.warn("[invite] captcha rejected", {
        ip,
        handle: parsed.data.handle,
        error: verdict.error,
      });
      return {
        status: "error",
        message: "That verification didn't go through — please try again.",
      };
    }
  }

  // Per-IP rate limit. Two windows: a short 5-min burst window prevents
  // form-replay floods, plus an hourly cap so even slow scripts can't
  // pile up. Generous enough for a small team brainstorming together not
  // to get blocked.
  //
  // Deliberately *after* the CAPTCHA: the limiter records a hit on every
  // allowed call, and at 3 per 5 minutes a visitor whose challenge errored
  // twice would have burned most of their budget on submissions that never
  // reached the DB. Gating first means the budget is only spent by
  // requests that already proved they're human. It costs nothing against a
  // flood either — a request with no token is rejected above before
  // anything leaves this process.
  //
  // v0.19 — the durable variant: counted in Postgres, so the window holds
  // across serverless instances instead of resetting with each new one.
  // This is the endpoint that most needed it.
  const limit = await checkRateLimitDurable(`invite:${ip}`, [
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

  // Per-recipient limit — the one the CAPTCHA and the per-IP window can't
  // cover between them. Both of those count the *sender*, so a proxy pool
  // rotating IPs (and solving a challenge each time, which is a purchasable
  // service) can point an unbounded number of confirm emails at one inbox.
  // Nothing was counting how much mail a single address had been sent.
  //
  // Anonymous path only: it's the sole branch that mails an address the
  // submitter typed. On the signed-in path the mail goes to the host, and
  // the address on the form is the visitor's own verified one.
  //
  // 5/hour, 12/day. Well above a real visitor — the per-IP window already
  // caps them at 10/hour, and inviting a dozen different hosts in one day
  // is enthusiastic, not typical — and far below "usable for flooding an
  // inbox". Keyed on the address as typed (lowercased), matching
  // signin:email:; it's what makes an incident greppable in the table.
  if (!skipConfirm) {
    const toKey = parsed.data.requesterEmail.toLowerCase();
    const toLimit = await checkRateLimitDurable(`invite:to:${toKey}`, [
      { max: 5, windowMs: 60 * 60 * 1000 },
      { max: 12, windowMs: 24 * 60 * 60 * 1000 },
    ]);
    if (!toLimit.allowed) {
      console.warn("[invite] recipient rate-limited", {
        ip,
        handle: parsed.data.handle,
        retryAfterSec: toLimit.retryAfterSec,
      });
      const mins = Math.max(1, Math.ceil(toLimit.retryAfterSec / 60));
      return {
        status: "error",
        message: `That email address has been used for a lot of invites lately. Try again in ${mins} min${mins === 1 ? "" : "s"}.`,
      };
    }
  }

  // Global ceiling. Everything above is per-something, so nothing bounded
  // the total — and a sending domain's reputation is an aggregate. This is
  // a circuit breaker, not a throttle: at ~7 invites all-time, 60/hour is
  // roughly a hundred times normal, so tripping it doesn't mean "busy", it
  // means something is wrong and the right outcome is to stop sending
  // until a human looks. Hence console.error, not warn.
  //
  // Checked LAST on purpose. A hit is recorded only when a call is allowed,
  // so a request already rejected above never touches this counter — which
  // is what stops the ceiling itself from becoming the attack: burn 60
  // rejected submissions an hour and nobody could invite anyone.
  //
  // The advisory lock in check_rate_limit is per-key, so this one key
  // serialises every invite submission. At this volume that's free; if
  // invites ever get busy enough for it to matter, that's the moment to
  // replace the ceiling with something sampled rather than exact.
  const globalLimit = await checkRateLimitDurable("invite:global", [
    { max: 60, windowMs: 60 * 60 * 1000 },
    { max: 300, windowMs: 24 * 60 * 60 * 1000 },
  ]);
  if (!globalLimit.allowed) {
    console.error("[invite] GLOBAL ceiling hit — invites paused", {
      ip,
      handle: parsed.data.handle,
      retryAfterSec: globalLimit.retryAfterSec,
    });
    return {
      status: "error",
      message:
        "Invites are paused for a moment while we catch up. Please try again shortly.",
    };
  }

  // Admin client — bypasses RLS for the host lookup + insert. The public
  // INSERT policy would work too, but going through admin lets us read the
  // host's email + handle in the same query without exposing them in a
  // chatty client-side flow.
  const admin = createSupabaseAdmin();
  const { data: host, error: hostErr } = await admin
    .from("profiles")
    .select("id, handle, city_until, timezone")
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

  // v0.18 — retire this host's timed-out invites before we try to write.
  // `invites_slot_active_idx` keys off `status` alone (it can't call now()
  // — a partial index predicate has to be immutable), so a row that's past
  // its TTL still occupies its slot as far as the index is concerned. The
  // read paths already ignore such rows, which means the visitor is being
  // offered a slot the insert below would then reject with a bogus "that
  // time was just taken". Sweeping first keeps the index's idea of "active"
  // in step with everyone else's. Scoped to this host and idempotent —
  // re-running matches nothing. Best-effort: a failure here just means the
  // visitor may see the 23505 message, not a lost invite.
  const { error: sweepErr } = await admin
    .from("invites")
    .update({ status: "expired" })
    .eq("host_id", hostId)
    .in("status", ["unconfirmed", "pending"])
    .lt("expires_at", new Date().toISOString());
  if (sweepErr) {
    console.warn("[invite] expiry sweep failed (non-fatal)", sweepErr);
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
  // v16 — if the visitor picked a scheduling slot, confirm it belongs to
  // this host and is still in the future before we write. The DB's partial
  // unique index is the real double-booking guard (the 23505 catch below);
  // this just rejects a stale or foreign slot id with a clear message.
  if (parsed.data.slotId) {
    const { data: slot } = await admin
      .from("availability_slots")
      .select("id, starts_at")
      .eq("id", parsed.data.slotId)
      .eq("host_id", hostId)
      .maybeSingle();
    if (!slot || new Date(slot.starts_at as string) <= new Date()) {
      return {
        status: "error",
        message: "That time isn't available anymore — pick another.",
        fieldErrors: { slotId: "Pick an available time." },
      };
    }
    // Presence binding (write side): mirror addSlot and listAvailableSlots so
    // a slot past the host's departure can't be booked via a crafted POST
    // after they've shortened their stay. listAvailableSlots already hides
    // these in the UI; this closes the gap for a hand-built request. Only
    // enforced while city_until is still ahead (stale past date = no bound),
    // compared in the host's display zone.
    const cityUntil = (host.city_until as string | null) ?? null;
    const tz = (host.timezone as string | null) ?? null;
    if (
      cityUntil &&
      cityUntil >= localDateInZone(new Date(), tz) &&
      localDateInZone(new Date(slot.starts_at as string), tz) > cityUntil
    ) {
      return {
        status: "error",
        message: "That time isn't available anymore — pick another.",
        fieldErrors: { slotId: "Pick an available time." },
      };
    }
  }

  const confirmToken = skipConfirm ? null : crypto.randomUUID();
  // Write expires_at rather than leaning on the column default: an invite
  // waiting on email confirmation gets an hour, one that's already pending
  // gets the host's full week. See the constants for why they differ.
  const expiresAt = new Date(
    Date.now() +
      (skipConfirm ? PENDING_INVITE_TTL_MS : UNCONFIRMED_INVITE_TTL_MS),
  ).toISOString();
  const { data: inserted, error: insertErr } = await admin
    .from("invites")
    .insert({
      expires_at: expiresAt,
      host_id: hostId,
      requester_name: parsed.data.requesterName,
      requester_email: parsed.data.requesterEmail,
      requester_topic: parsed.data.requesterTopic,
      requested_kind: parsed.data.requestedKind,
      preferred_time: parsed.data.preferredTime ?? null,
      slot_id: parsed.data.slotId ?? null,
      requester_locale: locale,
      status: skipConfirm ? "pending" : "unconfirmed",
      confirm_token: confirmToken,
      confirmed_at: skipConfirm ? new Date().toISOString() : null,
    })
    // Needed to roll the row back if the confirm email doesn't make it out.
    .select("id")
    .maybeSingle();
  if (insertErr) {
    // 23505 = the partial unique index fired: another active invite already
    // holds this slot. Surface it as "just taken" so the visitor re-picks.
    if (insertErr.code === "23505") {
      return {
        status: "error",
        message: "That time was just taken — pick another.",
        fieldErrors: { slotId: "Just taken — pick another." },
      };
    }
    return {
      status: "error",
      message: `Couldn't save the invite: ${insertErr.message}`,
    };
  }

  const hostDisplayName = deriveDisplayName(hostHandle);
  if (skipConfirm) {
    // Signed-in path: the host notification is the same work the confirm
    // route does after a visitor clicks their link, inlined here because
    // there's no link to send. Scheduled with after() for the same reason
    // that route uses it — the visitor's "sent" outcome doesn't depend on
    // it, so two admin lookups plus a provider round-trip shouldn't sit in
    // the path of their submit. The row is already committed; a failure
    // here degrades the host's heads-up, it can't lose the invite.
    const notify = {
      requesterName: parsed.data.requesterName,
      requesterEmail: parsed.data.requesterEmail,
      requesterTopic: parsed.data.requesterTopic,
      kind: parsed.data.requestedKind as CoffeeChatKind,
      preferredTime: parsed.data.preferredTime ?? null,
    };
    after(async () => {
      try {
        const { data: hostAuth } = await admin.auth.admin.getUserById(hostId);
        const hostNotifyEmail = hostAuth.user?.email ?? null;
        if (!hostNotifyEmail) return;
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
        await emailNewInvite({
          to: hostNotifyEmail,
          hostHandle,
          ...notify,
          locale: hostLocale,
        });
      } catch (e) {
        console.warn("[invite] host notification failed (non-fatal)", e);
      }
    });
  } else {
    // AA2 anti-spam: the host is NOT notified here. Visitor must click
    // the confirm link in this email first; that promotes the row to
    // `pending` and triggers emailNewInvite to the host. Fake emails
    // bounce here without disturbing anyone.
    const sent = await emailInviteConfirm({
      to: parsed.data.requesterEmail,
      requesterName: parsed.data.requesterName,
      hostDisplayName,
      hostHandle,
      // confirmToken is non-null on the AA2 branch by construction.
      confirmToken: confirmToken!,
      locale,
    });
    if (!sent.ok) {
      // Without that email the row is inert — there's no other way to reach
      // the confirm link. Worse, it sits on the visitor's chosen slot for the
      // next hour, so their retry would collide with their own dead attempt
      // and get told "that time was just taken". Roll it back and say what
      // actually happened instead of "check your email" about an email that
      // doesn't exist. Provider outages and send-rate limits both land here.
      console.error("[invite] confirm email failed — invite rolled back", {
        handle: hostHandle,
        error: sent.error,
      });
      if (inserted?.id) {
        await admin.from("invites").delete().eq("id", inserted.id as string);
      }
      return {
        status: "error",
        message:
          "We couldn't send the confirmation email — nothing was submitted. Check the address and try again.",
      };
    }
  }

  // Revalidate the host's profile so the new pending invite shows up in
  // their inbox on next visit. Tag-style invalidation would be cleaner
  // but path-based revalidation is enough at this scale.
  revalidatePath("/profile");

  return { status: "sent", needsConfirm: !skipConfirm };
}
