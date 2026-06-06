"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  emailInviteAccepted,
  emailInviteDeclined,
  emailWelcome,
  type SendResult,
} from "@/lib/email";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createSupabaseAdmin,
  createSupabaseServer,
  isAuthConfigured,
} from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n";
import { type Locale } from "@/lib/i18n/dict";
import { checkRateLimit, ipFromHeaders } from "@/lib/rate-limit";
import { RESERVED_HANDLES } from "@/lib/reserved-handles";
import { COFFEE_CHAT_KINDS, GENDERS, type SocialLink } from "@/lib/types";
import { validateSocialLinks } from "@/lib/socials";
import { validateInterests } from "@/lib/interests";
import {
  formatShortDate,
  formatSlot,
  isValidTimeZone,
  localDateInZone,
} from "@/lib/datetime";

// Rate-limit helper for signed-in server actions. Keys on user.id when
// available (otherwise falls back to IP) so a single signed-in account
// can't dodge limits by rotating IPs, nor can two users at the same
// office block each other.
async function rlKey(scope: string, userId: string | null): Promise<string> {
  if (userId) return `${scope}:u:${userId}`;
  const ip = ipFromHeaders(await headers());
  return `${scope}:ip:${ip}`;
}

// Narrow Supabase's `unknown` value to our Locale union before passing
// downstream — keeps the email helpers honest if anyone ever loosens
// the CHECK constraint on invites.requester_locale.
function isInviteLocale(v: unknown): v is Locale {
  return v === "en" || v === "zh" || v === "ja";
}

const AUTO_HANDLE = /^user_[a-f0-9]{8}$/;

function safeAfter(raw: FormDataEntryValue | null): string | undefined {
  if (typeof raw !== "string" || !raw) return undefined;
  if (!raw.startsWith("/")) return undefined;
  if (raw.startsWith("//")) return undefined;
  return raw;
}

// Constraints chosen to match the DB:
//  - handle: a-z 0-9 _ only, 3-20 chars, unique
//  - bio: ≤ 140 chars (matches profiles bio CHECK)
//  - city: free-form, ≤ 60 chars
//  - coffee_chat_kinds: subset of COFFEE_CHAT_KINDS
//  - telegram_handle: stored without leading @
//  - email_contact: standard email, ≤ 120 chars
// WhatsApp is intentionally not collected: revealing a phone number on a
// one-click accept (before the two have ever met) is too much, too soon.
// If they want to swap numbers they do it themselves once they're talking.
const ProfileSchema = z.object({
  handle: z
    .string()
    .min(3, "Handle needs at least 3 characters.")
    .max(20, "Handle is at most 20 characters.")
    .regex(
      /^[a-z0-9_]+$/,
      "Lowercase letters, digits, and _ only — no spaces or symbols.",
    ),
  bio: z.string().max(140, "Bio is at most 140 characters.").optional(),
  city: z
    .string()
    .max(60, "City is at most 60 characters.")
    .optional(),
  // v0.11 — optional ISO date (YYYY-MM-DD) for "I'm here until X".
  // Past dates are accepted on write (the row may have rolled past
  // its own date between two edits and we don't want a save to fail
  // because of it); the read path treats stale dates as "no banner"
  // so they self-cool. Upper bound matches the DB CHECK loosely.
  cityUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a calendar date.")
    .refine((s) => {
      const d = new Date(`${s}T00:00:00Z`);
      return !Number.isNaN(d.getTime()) && s >= "2024-01-01" && s <= "2100-01-01";
    }, "Pick a date within the next few years.")
    .optional(),
  coffeeChatKinds: z
    .array(z.enum(COFFEE_CHAT_KINDS))
    .max(COFFEE_CHAT_KINDS.length)
    .optional(),
  telegramHandle: z
    .string()
    .regex(
      /^@?[a-zA-Z0-9_]{5,32}$/,
      "Telegram username only — 5–32 letters/digits/_, no spaces. The @ is optional.",
    )
    .optional(),
  emailContact: z
    .string()
    .email("That doesn't look like a valid email.")
    .max(120, "Email is at most 120 characters.")
    .optional(),
  gender: z.enum(GENDERS).optional(),
  // socialLinks comes in as a JSON string in the form submission (the
  // SocialsEditor stringifies its array into a hidden input). Parse +
  // per-platform validation happens AFTER the Zod gate via
  // validateSocialLinks — Zod's shape isn't expressive enough for
  // per-row platform-dependent regex, and parsing here gives a clean
  // separation.
});

// `socialLinks` lives outside the Zod schema (per-row validation is
// platform-dependent) but still needs a field-error slot so the form
// can surface "Instagram: username only — …" inline.
type ExtraFields = "socialLinks" | "interests";
export type ProfileEventName = "signup_completed" | "card_published";
export type ProfileState = {
  status: "idle" | "saved" | "error";
  message?: string;
  fieldErrors?: Partial<
    Record<keyof z.infer<typeof ProfileSchema> | ExtraFields, string>
  >;
  // Funnel events for the client to fire post-save. Server detects
  // transitions (auto-handle → real handle, incomplete → publishable)
  // and pushes the event names back so the GA bridge doesn't have to
  // mirror the same diff logic on the client.
  events?: ProfileEventName[];
};

function trimOrUndefined(v: FormDataEntryValue | null): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
}

// Title-case the city name on write so "chiang mai", "ChiangMai", and
// "CHIANG MAI" all land as "Chiang Mai" in the DB. Cheap normalisation
// that prevents dispersion now and keeps a future city-aggregation page
// honest. Multi-word cities (San Francisco, Mexico City) get every word
// capitalised; punctuation is preserved as-is.
function normaliseCity(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (!collapsed) return undefined;
  return collapsed
    .split(" ")
    .map((word) =>
      word.length === 0
        ? word
        : word[0].toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(" ");
}

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  if (!isAuthConfigured()) {
    return { status: "error", message: "Sign-in isn't configured yet." };
  }

  // coffeeChatKinds arrives as multiple form values under the same name —
  // checkbox-style submission from the chip group. Filter to non-empty
  // strings before Zod validates against the union.
  const rawKinds = formData
    .getAll("coffeeChatKinds")
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  const parsed = ProfileSchema.safeParse({
    handle: trimOrUndefined(formData.get("handle")),
    bio: trimOrUndefined(formData.get("bio")),
    city: normaliseCity(trimOrUndefined(formData.get("city"))),
    cityUntil: trimOrUndefined(formData.get("cityUntil")),
    coffeeChatKinds: rawKinds,
    telegramHandle: trimOrUndefined(formData.get("telegramHandle")),
    emailContact: trimOrUndefined(formData.get("emailContact")),
    gender: trimOrUndefined(formData.get("gender")),
  });
  if (!parsed.success) {
    const fieldErrors: ProfileState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0] as keyof z.infer<typeof ProfileSchema>;
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors };
  }

  // socialLinks: JSON-encoded by the SocialsEditor. Parse + per-row
  // validate via the central registry so the messaging stays in one
  // place. Empty / missing payload = "no socials"; not an error.
  let socialLinks: SocialLink[] = [];
  const rawSocials = formData.get("socialLinks");
  if (typeof rawSocials === "string" && rawSocials.trim().length > 0) {
    let candidate: unknown;
    try {
      candidate = JSON.parse(rawSocials);
    } catch {
      return {
        status: "error",
        message: "Social links payload was malformed.",
        fieldErrors: { socialLinks: "Couldn't read the social links list." },
      };
    }
    const result = validateSocialLinks(candidate);
    if (!result.ok) {
      return {
        status: "error",
        message: "Please fix the highlighted fields.",
        fieldErrors: { socialLinks: result.message },
      };
    }
    socialLinks = result.links;
  }

  // Trust & safety note: every social platform is now username/handle-based
  // (the value slots into a fixed per-platform URL template), so a card can
  // no longer carry an arbitrary URL — the old website/mastodon free-URL
  // Safe Browsing screen was retired along with those platforms.

  // interests: JSON-encoded by the InterestsEditor (same hidden-input
  // pattern as socials). Normalisation + caps live in lib/interests.ts so
  // the messaging stays in one place. Empty / missing payload = "no tags".
  let interests: string[] = [];
  const rawInterests = formData.get("interests");
  if (typeof rawInterests === "string" && rawInterests.trim().length > 0) {
    let candidate: unknown;
    try {
      candidate = JSON.parse(rawInterests);
    } catch {
      return {
        status: "error",
        message: "Interests payload was malformed.",
        fieldErrors: { interests: "Couldn't read the interests list." },
      };
    }
    const result = validateInterests(candidate);
    if (!result.ok) {
      return {
        status: "error",
        message: "Please fix the highlighted fields.",
        fieldErrors: { interests: result.message },
      };
    }
    interests = result.interests;
  }

  if (RESERVED_HANDLES.has(parsed.data.handle)) {
    return {
      status: "error",
      message: "That handle is reserved.",
      fieldErrors: { handle: "That handle is reserved — try another." },
    };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in to edit your profile." };

  // Per-user rate limit: 10 saves / minute is plenty for normal editing
  // bursts (typo fixes, social-row adds) and cheap enough to stop a
  // signed-in client from hammering the row. 60 / hour is the longer
  // backstop against slow but persistent abuse.
  const updLimit = checkRateLimit(await rlKey("updateProfile", user.id), [
    { max: 10, windowMs: 60_000 },
    { max: 60, windowMs: 60 * 60_000 },
  ]);
  if (!updLimit.allowed) {
    return {
      status: "error",
      message: `Slow down — try again in ${updLimit.retryAfterSec}s.`,
    };
  }

  // Read the previous handle BEFORE the update so we can detect the
  // auto-handle → real-handle transition (= onboarding completion) and
  // fire the welcome email exactly once.
  const { data: priorProfile } = await supabase
    .from("profiles")
    .select("handle")
    .eq("id", user.id)
    .maybeSingle();
  const priorHandle = (priorProfile?.handle as string | undefined) ?? null;
  const isOnboardingCompletion =
    priorHandle !== null &&
    AUTO_HANDLE.test(priorHandle) &&
    !AUTO_HANDLE.test(parsed.data.handle);

  // Mirror the current request locale onto profiles.locale so future
  // host-facing emails (new-invite notification) come in the right
  // language. setLocale also writes here, but covering the path where
  // the user just edits their card without ever clicking the language
  // switcher is the more common case.
  const locale = await getLocale();

  const telegram = parsed.data.telegramHandle?.replace(/^@/, "") ?? null;
  // Normalise each social row's stored value — every platform is now
  // username-based, so strip a leading @ uniformly and let urlFor compose
  // the canonical link (e.g. `https://x.com/{value}`).
  const normalisedSocials = socialLinks.map((l) => ({
    platform: l.platform,
    value: l.value.replace(/^@/, "").trim(),
  }));
  // If the user cleared their city, drop city_until too — a "until" date
  // without a city is nonsense and would render as orphan banner state.
  const cityUntil =
    parsed.data.city && parsed.data.cityUntil
      ? parsed.data.cityUntil
      : null;

  // v16 — opt-in coffee scheduling. Hidden input submits "true"/"false";
  // default off, so anything but an explicit "true" leaves it disabled.
  const schedulingEnabled = formData.get("schedulingEnabled") === "true";

  // v16 — host's display timezone for scheduling slots. The editor submits
  // an IANA name (only rendered when scheduling is on), but the action must
  // not trust it: validate before persisting so a hand-rolled POST can't
  // store junk that would make formatSlot silently fall back to the server
  // zone for everyone. Field absent (scheduling off) → leave it untouched
  // rather than null it out, which would drop a previously-set zone.
  const rawTimezone = trimOrUndefined(formData.get("timezone"));
  if (rawTimezone !== undefined && !isValidTimeZone(rawTimezone)) {
    return { status: "error", message: "That timezone isn't valid." };
  }
  const timezonePatch =
    rawTimezone !== undefined ? { timezone: rawTimezone } : {};

  const { error } = await supabase
    .from("profiles")
    .update({
      handle: parsed.data.handle,
      bio: parsed.data.bio ?? null,
      city: parsed.data.city ?? null,
      city_until: cityUntil,
      coffee_chat_kinds: parsed.data.coffeeChatKinds ?? [],
      telegram_handle: telegram,
      email_contact: parsed.data.emailContact ?? null,
      gender: parsed.data.gender ?? null,
      social_links: normalisedSocials,
      interests,
      scheduling_enabled: schedulingEnabled,
      ...timezonePatch,
      locale,
    })
    .eq("id", user.id);

  if (error) {
    // Postgres unique_violation
    if (error.code === "23505") {
      return {
        status: "error",
        message: "That handle is taken.",
        fieldErrors: { handle: "Already taken." },
      };
    }
    return { status: "error", message: error.message };
  }

  revalidatePath("/profile");
  revalidatePath("/", "layout"); // SiteNav uses handle, lives in layout.

  if (isOnboardingCompletion && user.email) {
    // Fire-and-forget — never throw back into the form. Failures land in
    // Vercel logs via the email helper's catch. Locale tracks the user's
    // current browsing language at the moment they finished onboarding.
    await emailWelcome({
      to: user.email,
      handle: parsed.data.handle,
      locale,
    });
  }

  // On onboarding completion (auto → real handle), land the user on their
  // freshly-claimed card so they see it live. (Onboarding is only forced
  // for cold sign-ins now — anyone who arrived with a destination was sent
  // straight there by /auth/callback, so there's nothing to resume here.)
  // welcome=1 fires the GA `signup_completed` beacon; the beacon strips
  // the query so a refresh doesn't double-count.
  if (isOnboardingCompletion) {
    redirect(`/${parsed.data.handle}?welcome=1`);
  }

  // Returning-user save: honour any explicit `after` (used by other entry
  // points that still want a custom destination). Otherwise stay on
  // /profile so the share panel + form re-render with the new state.
  const after = safeAfter(formData.get("after"));
  if (after) redirect(after);

  return { status: "saved", message: "Saved." };
}

// Real-time handle availability check. Called from ProfileForm on a
// debounced effect so the user sees "Available ✓" / "Taken" / "Reserved"
// inline instead of finding out on Save. Cheap query — `select id`
// against the unique-indexed handle column. Returns a structured shape
// so the UI can render the right colour + copy per state.
export type HandleCheckResult =
  | { status: "available" }
  | { status: "taken" }
  | { status: "reserved" }
  | { status: "invalid"; reason: string }
  | { status: "yours" };

export async function checkHandleAvailable(
  raw: string,
): Promise<HandleCheckResult> {
  const handle = raw.trim().toLowerCase();

  // Client already runs the same regex but check again — protects against
  // anyone calling the action directly with junk.
  if (handle.length < 3) {
    return { status: "invalid", reason: "Needs at least 3 characters." };
  }
  if (handle.length > 20) {
    return { status: "invalid", reason: "At most 20 characters." };
  }
  if (!/^[a-z0-9_]+$/.test(handle)) {
    return {
      status: "invalid",
      reason: "Lowercase letters, digits, and _ only.",
    };
  }

  if (RESERVED_HANDLES.has(handle)) return { status: "reserved" };

  if (!isAuthConfigured()) {
    // Configuration error — don't claim "available" without a check.
    return {
      status: "invalid",
      reason: "Couldn't check availability — try again in a moment.",
    };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Tightly cap availability lookups so this action can't be turned into
  // a handle-enumeration probe. 30 / min is enough for normal typing
  // (the form debounces keystrokes), and 200 / hour catches slow scans.
  // Keyed on user.id when signed in so an attacker can't dodge by
  // rotating IPs from one account.
  const hcLimit = checkRateLimit(
    await rlKey("checkHandle", user?.id ?? null),
    [
      { max: 30, windowMs: 60_000 },
      { max: 200, windowMs: 60 * 60_000 },
    ],
  );
  if (!hcLimit.allowed) {
    return {
      status: "invalid",
      reason: `Too many checks — slow down and retry in ${hcLimit.retryAfterSec}s.`,
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", handle)
    .maybeSingle();
  if (error) {
    return {
      status: "invalid",
      reason: "Couldn't check availability — try again in a moment.",
    };
  }
  if (data) {
    // The user's own handle reads as "yours" so the form doesn't show
    // "Taken" against the value they're currently saved with.
    if (user && (data.id as string) === user.id) {
      return { status: "yours" };
    }
    return { status: "taken" };
  }
  return { status: "available" };
}

// Self-serve account delete. Removes the avatar file, the auth.users row,
// and (via the profiles.id ON DELETE CASCADE foreign key) the profile row
// in one shot. Service-role required because auth.admin.deleteUser only
// runs with the service key — the anon-key client has no way to remove an
// auth row even for the signed-in owner. Returns a structured result so
// the client component can show errors inline; on success the client is
// responsible for the redirect (calling redirect() from an imperatively-
// invoked action would just throw past the awaiting client code).
export type DeleteAccountResult =
  | { status: "ok" }
  | { status: "error"; message: string };

export async function deleteAccount(): Promise<DeleteAccountResult> {
  if (!isAuthConfigured()) {
    return { status: "error", message: "Sign-in isn't configured." };
  }
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "No session — sign in first." };
  }

  // Hard backstop: nobody legitimately deletes their account more than a
  // couple of times. Caps a confused or hostile client from churning
  // service-role delete calls.
  const delLimit = checkRateLimit(await rlKey("deleteAccount", user.id), [
    { max: 3, windowMs: 60 * 60_000 },
  ]);
  if (!delLimit.allowed) {
    return {
      status: "error",
      message: `Too many delete attempts — try again later.`,
    };
  }

  // Best-effort avatar cleanup. Failure here is loggable but not fatal —
  // the storage RLS already scopes deletion to the owner anyway.
  try {
    await supabase.storage
      .from("avatars")
      .remove([`${user.id}/avatar.webp`]);
  } catch (e) {
    console.warn("[deleteAccount] avatar removal failed (proceeding)", e);
  }

  let admin;
  try {
    admin = createSupabaseAdmin();
  } catch (e) {
    return {
      status: "error",
      message:
        e instanceof Error
          ? e.message
          : "Service role key missing — server cannot delete accounts.",
    };
  }
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    return {
      status: "error",
      message: `Account delete failed: ${delErr.message}`,
    };
  }

  // Local session is now invalid — clear cookies so any subsequent request
  // on this browser tab doesn't see a half-zombie session.
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  return { status: "ok" };
}

// Host-side accept/decline for an invite. Both paths share the same lookup
// + ownership check + status transition + revalidate; the only branch is
// which email the visitor receives. Returns a structured result so the
// inbox UI can show inline errors without throwing past the action call.
export type InviteDecisionResult =
  // emailDelivered is set only on the accept path: false means the invite
  // is accepted but the contact-delivery email to the visitor failed, so
  // the UI can prompt a resend. Undefined on decline (no such email).
  | { status: "ok"; emailDelivered?: boolean }
  | { status: "error"; message: string };

export async function approveInvite(
  inviteId: string,
): Promise<InviteDecisionResult> {
  return decideInvite(inviteId, "accepted");
}

export async function rejectInvite(
  inviteId: string,
): Promise<InviteDecisionResult> {
  return decideInvite(inviteId, "declined");
}

async function decideInvite(
  inviteId: string,
  next: "accepted" | "declined",
): Promise<InviteDecisionResult> {
  if (!isAuthConfigured()) {
    return { status: "error", message: "Sign-in isn't configured." };
  }
  if (typeof inviteId !== "string" || !inviteId) {
    return { status: "error", message: "Missing invite id." };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "Sign in to manage invites." };
  }

  // Host inbox decisions are uncommon enough that 30 / minute is way
  // above legitimate use. This caps a scripted client from racing
  // through pending invites + firing notification emails to visitors.
  const decLimit = checkRateLimit(await rlKey("decideInvite", user.id), [
    { max: 30, windowMs: 60_000 },
    { max: 120, windowMs: 60 * 60_000 },
  ]);
  if (!decLimit.allowed) {
    return {
      status: "error",
      message: `Slow down — try again in ${decLimit.retryAfterSec}s.`,
    };
  }

  // Fetch the invite via RLS-scoped read — the policy already restricts
  // SELECT to the host, so an attacker-supplied id for someone else's
  // invite returns null + we bail. requester_locale comes along so the
  // accept/decline email matches the language the visitor submitted in.
  const { data: invite, error: readErr } = await supabase
    .from("invites")
    .select(
      "id, host_id, requester_name, requester_email, requester_topic, preferred_time, status, expires_at, requester_locale, availability_slots(starts_at)",
    )
    .eq("id", inviteId)
    .maybeSingle();
  if (readErr) {
    return { status: "error", message: readErr.message };
  }
  if (!invite || invite.host_id !== user.id) {
    return { status: "error", message: "Invite not found." };
  }
  if (invite.status !== "pending") {
    return {
      status: "error",
      message: `Invite is already ${invite.status}.`,
    };
  }
  if (new Date(invite.expires_at as string) < new Date()) {
    return {
      status: "error",
      message: "Invite expired before you got to it.",
    };
  }

  // Guard the transition on the row still being `pending` so two
  // concurrent decisions (a double-tapped Accept, or Accept racing
  // Decline) can't both win and each fire a visitor email. Only the
  // request that flips the status gets a row back; the loser bails
  // without sending. The status pre-check above is the fast path; this
  // is the actual race guard.
  const { data: won, error: updateErr } = await supabase
    .from("invites")
    .update({ status: next, decided_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (updateErr) {
    return { status: "error", message: updateErr.message };
  }
  if (!won) {
    return { status: "error", message: "Invite was already handled." };
  }

  // Need the host's profile + contacts to compose the accept email —
  // server-side, never sent to the browser.
  const requesterLocale = isInviteLocale(invite.requester_locale)
    ? invite.requester_locale
    : "en";
  if (next === "accepted") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("handle, telegram_handle, email_contact, timezone")
      .eq("id", user.id)
      .maybeSingle();
    if (profile) {
      const handle = profile.handle as string;
      const displayName = handle
        .split("_")
        .filter(Boolean)
        .map((p) => p[0].toUpperCase() + p.slice(1))
        .join(" ");
      // If the visitor booked a slot, name the time (host tz, visitor
      // locale) in the accept email.
      const slotIso =
        (invite.availability_slots as { starts_at?: string } | null)
          ?.starts_at ?? null;
      const meetingTime = slotIso
        ? formatSlot(
            slotIso,
            (profile.timezone as string | null) ?? null,
            requesterLocale,
          )
        : null;
      const send = await emailInviteAccepted({
        to: invite.requester_email as string,
        requesterName: invite.requester_name as string,
        hostHandle: handle,
        hostDisplayName: displayName,
        telegramHandle: (profile.telegram_handle as string | null) ?? null,
        emailContact: (profile.email_contact as string | null) ?? null,
        meetingTime,
        locale: requesterLocale,
      });
      // Persist the hand-off outcome so the inbox can flag a failed
      // delivery + offer a resend even after the host navigates away.
      await recordContactEmail(supabase, inviteId, send);
      revalidatePath("/profile");
      return { status: "ok", emailDelivered: send.ok };
    }
  } else {
    const { data: profile } = await supabase
      .from("profiles")
      .select("handle")
      .eq("id", user.id)
      .maybeSingle();
    const handle = (profile?.handle as string | undefined) ?? "the host";
    const displayName = handle
      .split("_")
      .filter(Boolean)
      .map((p) => p[0].toUpperCase() + p.slice(1))
      .join(" ");
    await emailInviteDeclined({
      to: invite.requester_email as string,
      requesterName: invite.requester_name as string,
      hostDisplayName: displayName,
      locale: requesterLocale,
    });
  }

  revalidatePath("/profile");
  return { status: "ok" };
}

// Persist the outcome of an accept-email send onto the invite row. On
// success: stamp contact_emailed_at + clear any prior error. On failure:
// record a (truncated) reason and leave contact_emailed_at null so the
// inbox flags it for resend. RLS scopes the update to the host's own row.
// Fire-and-forget shape — a write failure here is logged, never thrown,
// so it can't undo an already-committed accept.
async function recordContactEmail(
  supabase: SupabaseClient,
  inviteId: string,
  send: SendResult,
): Promise<void> {
  const patch = send.ok
    ? { contact_emailed_at: new Date().toISOString(), last_email_error: null }
    : { contact_emailed_at: null, last_email_error: send.error.slice(0, 300) };
  const { error } = await supabase
    .from("invites")
    .update(patch)
    .eq("id", inviteId);
  if (error) {
    console.warn("[recordContactEmail] update failed (non-fatal)", error);
  }
}

// Re-send the contact-hand-off email for an already-accepted invite whose
// first send failed (or the host just wants to resend). Re-reads the
// host's current contacts so an updated Telegram/email goes out, and
// re-records the outcome. RLS-scoped: an id for someone else's invite
// reads back null and bails.
export async function resendAcceptedContact(
  inviteId: string,
): Promise<InviteDecisionResult> {
  if (!isAuthConfigured()) {
    return { status: "error", message: "Sign-in isn't configured." };
  }
  if (typeof inviteId !== "string" || !inviteId) {
    return { status: "error", message: "Missing invite id." };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "Sign in to manage invites." };
  }

  // Same envelope as decideInvite — resends fire visitor emails, so cap
  // them well above legitimate use.
  const rlLimit = checkRateLimit(await rlKey("resendContact", user.id), [
    { max: 10, windowMs: 60_000 },
    { max: 60, windowMs: 60 * 60_000 },
  ]);
  if (!rlLimit.allowed) {
    return {
      status: "error",
      message: `Slow down — try again in ${rlLimit.retryAfterSec}s.`,
    };
  }

  const { data: invite, error: readErr } = await supabase
    .from("invites")
    .select(
      "id, host_id, requester_name, requester_email, status, requester_locale, availability_slots(starts_at)",
    )
    .eq("id", inviteId)
    .maybeSingle();
  if (readErr) return { status: "error", message: readErr.message };
  if (!invite || invite.host_id !== user.id) {
    return { status: "error", message: "Invite not found." };
  }
  if (invite.status !== "accepted") {
    return {
      status: "error",
      message: "Only accepted invites can be resent.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("handle, telegram_handle, email_contact, timezone")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    return { status: "error", message: "Your profile is missing." };
  }
  const handle = profile.handle as string;
  const displayName = handle
    .split("_")
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
  const requesterLocale = isInviteLocale(invite.requester_locale)
    ? invite.requester_locale
    : "en";
  const slotIso =
    (invite.availability_slots as { starts_at?: string } | null)?.starts_at ??
    null;
  const meetingTime = slotIso
    ? formatSlot(slotIso, (profile.timezone as string | null) ?? null, requesterLocale)
    : null;

  const send = await emailInviteAccepted({
    to: invite.requester_email as string,
    requesterName: invite.requester_name as string,
    hostHandle: handle,
    hostDisplayName: displayName,
    telegramHandle: (profile.telegram_handle as string | null) ?? null,
    emailContact: (profile.email_contact as string | null) ?? null,
    meetingTime,
    locale: requesterLocale,
  });
  await recordContactEmail(supabase, inviteId, send);

  revalidatePath("/profile");
  if (!send.ok) {
    return {
      status: "error",
      message: "Still couldn't send — check the email address and retry.",
    };
  }
  return { status: "ok", emailDelivered: true };
}

// ───────────────────────── scheduling (v16) ─────────────────────────

export type SlotActionResult =
  | { status: "ok" }
  | { status: "error"; message: string };

// Add one availability slot. The client sends an absolute instant (it
// anchors the datetime-local value to the host's *chosen* display tz) plus
// that tz name. We validate it's a real, near-future instant and store it;
// the timezone is stamped on the profile the first time as a bootstrap so
// slots render consistently even before the host saves the profile form
// (which is the authoritative path for changing it). RLS scopes the insert
// to the host.
export async function addSlot(
  startsAtIso: string,
  timezone: string,
): Promise<SlotActionResult> {
  if (!isAuthConfigured()) {
    return { status: "error", message: "Sign-in isn't configured." };
  }
  const when = new Date(startsAtIso);
  if (Number.isNaN(when.getTime())) {
    return { status: "error", message: "That isn't a valid time." };
  }
  if (when.getTime() <= Date.now()) {
    return { status: "error", message: "Pick a time in the future." };
  }
  // Two-year ceiling — a slot further out than that is almost certainly a
  // typo (wrong year on the picker).
  if (when.getTime() > Date.now() + 2 * 365 * 24 * 60 * 60 * 1000) {
    return { status: "error", message: "That's too far in the future." };
  }
  const tz =
    typeof timezone === "string" && timezone.trim().length > 0
      ? timezone.trim().slice(0, 64)
      : null;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in to add times." };

  const addLimit = checkRateLimit(await rlKey("addSlot", user.id), [
    { max: 20, windowMs: 60_000 },
    { max: 100, windowMs: 60 * 60_000 },
  ]);
  if (!addLimit.allowed) {
    return {
      status: "error",
      message: `Slow down — try again in ${addLimit.retryAfterSec}s.`,
    };
  }

  // Presence binding: a host shouldn't offer a coffee time after they've
  // left the city they say they're in. Compare the slot's calendar date in
  // the host's display zone against their `city_until` departure date. Only
  // enforced while city_until is still ahead — a stale past date reads as
  // "no end date / I live here", same as the PresenceBanner. Null (resident,
  // no end date) imposes no bound.
  const { data: prof } = await supabase
    .from("profiles")
    .select("city, city_until, timezone")
    .eq("id", user.id)
    .maybeSingle();
  const cityUntil = (prof?.city_until as string | null) ?? null;
  const displayTz = (prof?.timezone as string | null) ?? tz;
  if (cityUntil && cityUntil >= localDateInZone(new Date(), displayTz)) {
    if (localDateInZone(when, displayTz) > cityUntil) {
      const where = (prof?.city as string | null) ?? "that city";
      const leave = formatShortDate(`${cityUntil}T12:00:00`, "en");
      return {
        status: "error",
        message: `You're in ${where} until ${leave} — pick an earlier time, or update your departure date first.`,
      };
    }
  }

  const { error } = await supabase.from("availability_slots").insert({
    host_id: user.id,
    starts_at: when.toISOString(),
  });
  if (error) return { status: "error", message: error.message };

  // Stamp the host's tz on first use so slots render in one consistent
  // zone. Only when not already set — don't clobber a deliberate value.
  if (tz) {
    await supabase
      .from("profiles")
      .update({ timezone: tz })
      .eq("id", user.id)
      .is("timezone", null);
  }

  revalidatePath("/profile");
  return { status: "ok" };
}

// Remove a slot the host owns — unless an active invite is holding it
// (a visitor has booked/requested that time). RLS already scopes the
// delete to the owner; the active-invite guard prevents pulling a slot
// out from under a pending request.
export async function removeSlot(slotId: string): Promise<SlotActionResult> {
  if (!isAuthConfigured()) {
    return { status: "error", message: "Sign-in isn't configured." };
  }
  if (typeof slotId !== "string" || !slotId) {
    return { status: "error", message: "Missing slot id." };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Sign in to manage times." };

  // Refuse if an active invite holds this slot — same status set as the
  // availability filter. The host should decline that invite first.
  const { data: held } = await supabase
    .from("invites")
    .select("id")
    .eq("slot_id", slotId)
    .in("status", ["unconfirmed", "pending", "accepted"])
    .limit(1);
  if (held && held.length > 0) {
    return {
      status: "error",
      message: "Someone's requested this time — decline that invite first.",
    };
  }

  const { error } = await supabase
    .from("availability_slots")
    .delete()
    .eq("id", slotId)
    .eq("host_id", user.id);
  if (error) return { status: "error", message: error.message };

  revalidatePath("/profile");
  return { status: "ok" };
}
