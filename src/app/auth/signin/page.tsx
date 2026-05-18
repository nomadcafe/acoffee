import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getMyProfile, getSessionUser } from "@/lib/auth-queries";
import { getLocale } from "@/lib/i18n";
import { t } from "@/lib/i18n/dict";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to acoffee with a one-tap email link.",
  alternates: { canonical: "/auth/signin" },
  robots: { index: false, follow: false },
};

// Only allow relative paths to avoid open-redirect via ?next=https://evil.com
function safeNext(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  if (!raw.startsWith("/")) return undefined;
  if (raw.startsWith("//")) return undefined; // protocol-relative
  return raw;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    error?: string;
    reason?: string;
    detail?: string;
  }>;
}) {
  const { next, error, reason, detail } = await searchParams;
  const safe = safeNext(next);

  // If the user is already signed in, the signin form has nothing to do —
  // shove them straight to `next` (if given), their own card (if a real
  // handle exists), or /profile as a last resort. Avoids the awkward state
  // where a logged-in visitor lands here from a stale link or the hero CTA
  // and still gets shown the "send me a link" form.
  if (!error) {
    const session = await getSessionUser();
    if (session) {
      if (safe) redirect(safe);
      const profile = await getMyProfile();
      if (profile) redirect(`/${profile.handle}`);
      redirect("/profile");
    }
  }

  const locale = await getLocale();
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-14 sm:py-20">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          {t(locale, "signin.eyebrow")}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {t(locale, "signin.h1")}
        </h1>
        <p className="text-base leading-[1.55] text-ink/70">
          {t(locale, "signin.sub")}
        </p>
      </header>
      {error === "callback" && (
        <div className="rounded-2xl border border-red-300/60 bg-red-50/60 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-300">
          <p>{callbackErrorMessage(reason, detail)}</p>
        </div>
      )}
      <SignInForm next={safe} />
    </main>
  );
}

// Map the internal failure tag from /auth/callback into copy a real user
// can act on. Raw `reason` + `detail` still travel in the URL query string
// so server logs / your-own-tab inspection retain the technical context —
// the UI just doesn't show it.
function callbackErrorMessage(
  reason: string | undefined,
  detail: string | undefined,
): string {
  if (reason === "not_configured") {
    return "Sign-in isn't set up on this server yet.";
  }
  if (reason === "no_code") {
    return "That sign-in link looks broken. Request a fresh one below.";
  }
  if (reason === "exchange_failed") {
    if (detail?.includes("pkce_code_verifier_not_found")) {
      return "This link was opened in a different browser or device than the one that requested it. Request a fresh link below — and open it in the same browser you'll be signing in from.";
    }
    if (
      detail?.includes("otp_expired") ||
      detail?.includes("expired") ||
      detail?.includes("invalid_grant")
    ) {
      return "That link has expired or already been used. Request a fresh one below — links last about an hour.";
    }
    return "That sign-in link couldn't be verified. Request a fresh one below.";
  }
  return "That sign-in link didn't work — it may have expired or been used already. Request a fresh one below.";
}
