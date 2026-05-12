import type { Metadata } from "next";
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

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-14 sm:py-20">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">
          acoffee · Sign in
        </p>
        <h1 className="font-display text-3xl font-medium sm:text-4xl">
          One tap, no password.
        </h1>
        <p className="text-sm text-muted">
          Enter your email — we&apos;ll send you a link that signs you in
          on the device you opened it from.
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
