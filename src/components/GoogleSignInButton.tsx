"use client";

import { useState } from "react";
import { useT } from "@/components/LocaleProvider";
import { createSupabaseBrowser } from "@/lib/supabase/browser";

// "Continue with Google" one-tap OAuth entry. Drops a user straight into
// the same /auth/callback that the magic-link flow uses, so first-time
// onboarding (auto handle → real handle redirect) reuses the existing
// path. The `next` query gets threaded through Supabase's redirectTo so
// the eventual landing matches the magic-link UX.
export function GoogleSignInButton({ next }: { next?: string }) {
  const t = useT();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowser();
      const origin = window.location.origin;
      const redirectTo =
        `${origin}/auth/callback` +
        (next ? `?next=${encodeURIComponent(next)}` : "");
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (err) throw err;
      // signInWithOAuth navigates the browser away — no need to clear
      // pending on success.
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not start Google sign-in.",
      );
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={start}
        disabled={pending}
        className="inline-flex items-center justify-center gap-2.5 rounded-2xl border border-bean bg-surface px-5 py-3 text-base font-medium text-ink/85 transition-colors hover:border-accent/60 hover:text-accent disabled:opacity-60"
      >
        <GoogleMark />
        {pending ? t("signin.google.pending") : t("signin.google")}
      </button>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

// Inline Google "G" mark. Inline so we don't pull in a logo asset for one
// button. The four-colour mark is the brand-correct option per Google's
// branding guidelines for OAuth buttons.
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.583-5.036-3.71H.957v2.332A8.997 8.997 0 009 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.707A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
