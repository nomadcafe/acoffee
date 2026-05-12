"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { emailWelcome } from "@/lib/email";
import { createSupabaseServer, isAuthConfigured } from "@/lib/supabase/server";

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
//  - telegram_handle: stored without leading @
//  - whatsapp_number: stored E.164 (+ + 7-15 digits, leading non-zero)
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

export async function updateProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  if (!isAuthConfigured()) {
    return { status: "error", message: "Sign-in isn't configured yet." };
  }

  const parsed = ProfileSchema.safeParse({
    handle: trimOrUndefined(formData.get("handle")),
    bio: trimOrUndefined(formData.get("bio")),
    telegramHandle: trimOrUndefined(formData.get("telegramHandle")),
    whatsappNumber: trimOrUndefined(formData.get("whatsappNumber")),
  });
  if (!parsed.success) {
    const fieldErrors: ProfileState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0] as keyof z.infer<typeof ProfileSchema>;
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors };
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

  const telegram = parsed.data.telegramHandle?.replace(/^@/, "") ?? null;
  const { error } = await supabase
    .from("profiles")
    .update({
      handle: parsed.data.handle,
      bio: parsed.data.bio ?? null,
      telegram_handle: telegram,
      whatsapp_number: parsed.data.whatsappNumber ?? null,
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
    // Vercel logs via the email helper's catch.
    await emailWelcome({ to: user.email, handle: parsed.data.handle });
  }

  // Onboarding hand-off: if the user came in via /auth/callback's first-time
  // path, finish by sending them where they were originally trying to go.
  const after = safeAfter(formData.get("after"));
  if (after) redirect(after);

  return { status: "saved", message: "Saved." };
}
