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
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
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
          That sign-in link didn&apos;t work — it may have expired or been used
          already. Request a fresh one below.
        </div>
      )}
      <SignInForm next={safe} />
    </main>
  );
}
