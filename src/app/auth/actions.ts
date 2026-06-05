"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { checkRateLimit, ipFromHeaders } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/site";
import { createSupabaseServer, isAuthConfigured } from "@/lib/supabase/server";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const SignInSchema = z.object({
  email: z.string().email("Please enter a valid email."),
  next: z.string().optional(),
});

export type SignInState = {
  status: "idle" | "sent" | "error";
  message?: string;
};

// Re-validate at action time too — never trust the hidden form input.
function safeNext(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  if (!raw.startsWith("/")) return undefined;
  if (raw.startsWith("//")) return undefined;
  return raw;
}

export async function sendMagicLink(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  if (!isAuthConfigured()) {
    return {
      status: "error",
      message: "Sign-in isn't configured yet on this environment.",
    };
  }
  const parsed = SignInSchema.safeParse({
    email: formData.get("email"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Invalid email.",
    };
  }

  // Two-axis throttle: IP catches "one location floods", email catches
  // "targeted harassment of one inbox". Either tripping returns the same
  // generic message so we don't leak which axis a probe hit.
  const ip = ipFromHeaders(await headers());
  const emailKey = parsed.data.email.toLowerCase();
  const ipLimit = checkRateLimit(`signin:ip:${ip}`, [
    { windowMs: HOUR_MS, max: 20 },
    { windowMs: DAY_MS, max: 60 },
  ]);
  const emailLimit = checkRateLimit(`signin:email:${emailKey}`, [
    { windowMs: HOUR_MS, max: 20 },
    { windowMs: DAY_MS, max: 60 },
  ]);
  if (!ipLimit.allowed || !emailLimit.allowed) {
    const retryAfterSec = Math.max(
      ipLimit.retryAfterSec,
      emailLimit.retryAfterSec,
    );
    return {
      status: "error",
      message: `Too many sign-in attempts — try again in ${Math.ceil(retryAfterSec / 60)} min.`,
    };
  }

  // Bot defence: when a Turnstile site key is configured, GoTrue is set to
  // require a CAPTCHA token (Supabase dashboard → Auth → enable CAPTCHA), so
  // a token must ride along. Fail fast with a friendly message if the widget
  // hasn't produced one yet rather than letting GoTrue reject it raw. When
  // no key is configured (local dev) this is a no-op and signInWithOtp runs
  // as before.
  const captchaToken =
    (formData.get("captchaToken") as string | null) || undefined;
  if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captchaToken) {
    return {
      status: "error",
      message: "Please complete the verification and try again.",
    };
  }

  const next = safeNext(parsed.data.next);
  const callback = next
    ? `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`
    : `${siteUrl}/auth/callback`;

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: callback, captchaToken },
  });
  if (error) {
    return { status: "error", message: error.message };
  }
  return {
    status: "sent",
    message: "Check your email for a one-tap sign-in link.",
  };
}

export async function signOut() {
  if (isAuthConfigured()) {
    const supabase = await createSupabaseServer();
    await supabase.auth.signOut();
  }
  redirect("/");
}
