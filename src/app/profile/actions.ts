"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  emailInviteAccepted,
  emailInviteDeclined,
  emailWelcome,
} from "@/lib/email";
import {
  createSupabaseAdmin,
  createSupabaseServer,
  isAuthConfigured,
} from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n";
import { type Locale } from "@/lib/i18n/dict";
import { COFFEE_CHAT_KINDS } from "@/lib/types";

// Narrow Supabase's `unknown` value to our Locale union before passing
// downstream — keeps the email helpers honest if anyone ever loosens
// the CHECK constraint on invites.requester_locale.
function isInviteLocale(v: unknown): v is Locale {
  return v === "en" || v === "zh" || v === "ja";
}

const AUTO_HANDLE = /^user_[a-f0-9]{8}$/;

// Handles that would shadow / conflict with top-level routes if claimed.
// Kept in sync with the same list in app/[handle]/page.tsx — they enforce
// the same rule from two ends (signup-time vs render-time).
const RESERVED_HANDLES = new Set([
  "api",
  "auth",
  "profile",
  "chiang-mai",
  "osaka",
  "lisbon",
  "bali",
  "settings",
  "admin",
  "about",
  "help",
  "terms",
  "privacy",
  "zh",
  "ja",
  "en",
]);

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
//  - whatsapp_number: stored E.164 (+ + 7-15 digits, leading non-zero)
//  - email_contact: standard email, ≤ 120 chars
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
  whatsappNumber: z
    .string()
    .regex(
      /^\+[1-9]\d{6,14}$/,
      "Phone needs the + and country code, e.g. +66812345678 (Thailand) or +14155551212 (US).",
    )
    .optional(),
  emailContact: z
    .string()
    .email("That doesn't look like a valid email.")
    .max(120, "Email is at most 120 characters.")
    .optional(),
});

export type ProfileState = {
  status: "idle" | "saved" | "error";
  message?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof ProfileSchema>, string>>;
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
    coffeeChatKinds: rawKinds,
    telegramHandle: trimOrUndefined(formData.get("telegramHandle")),
    whatsappNumber: trimOrUndefined(formData.get("whatsappNumber")),
    emailContact: trimOrUndefined(formData.get("emailContact")),
  });
  if (!parsed.success) {
    const fieldErrors: ProfileState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0] as keyof z.infer<typeof ProfileSchema>;
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors };
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
  const { error } = await supabase
    .from("profiles")
    .update({
      handle: parsed.data.handle,
      bio: parsed.data.bio ?? null,
      city: parsed.data.city ?? null,
      coffee_chat_kinds: parsed.data.coffeeChatKinds ?? [],
      telegram_handle: telegram,
      whatsapp_number: parsed.data.whatsappNumber ?? null,
      email_contact: parsed.data.emailContact ?? null,
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

  // On onboarding completion (auto → real handle), always send the user to
  // their freshly-claimed card so they see the artefact live with their
  // own avatar + status. The `after` we received from /auth/callback was
  // keyed on the now-stale auto handle and would 404; ignore it.
  if (isOnboardingCompletion) {
    redirect(`/${parsed.data.handle}`);
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
  | { status: "ok" }
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

  // Fetch the invite via RLS-scoped read — the policy already restricts
  // SELECT to the host, so an attacker-supplied id for someone else's
  // invite returns null + we bail. requester_locale comes along so the
  // accept/decline email matches the language the visitor submitted in.
  const { data: invite, error: readErr } = await supabase
    .from("invites")
    .select(
      "id, host_id, requester_name, requester_email, requester_topic, mode, preferred_time, status, expires_at, requester_locale",
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

  const { error: updateErr } = await supabase
    .from("invites")
    .update({ status: next, decided_at: new Date().toISOString() })
    .eq("id", inviteId);
  if (updateErr) {
    return { status: "error", message: updateErr.message };
  }

  // Need the host's profile + contacts to compose the accept email —
  // server-side, never sent to the browser.
  const requesterLocale = isInviteLocale(invite.requester_locale)
    ? invite.requester_locale
    : "en";
  if (next === "accepted") {
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "handle, telegram_handle, whatsapp_number, email_contact",
      )
      .eq("id", user.id)
      .maybeSingle();
    if (profile) {
      const handle = profile.handle as string;
      const displayName = handle
        .split("_")
        .filter(Boolean)
        .map((p) => p[0].toUpperCase() + p.slice(1))
        .join(" ");
      await emailInviteAccepted({
        to: invite.requester_email as string,
        requesterName: invite.requester_name as string,
        hostHandle: handle,
        hostDisplayName: displayName,
        telegramHandle: (profile.telegram_handle as string | null) ?? null,
        whatsappNumber: (profile.whatsapp_number as string | null) ?? null,
        emailContact: (profile.email_contact as string | null) ?? null,
        locale: requesterLocale,
      });
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
