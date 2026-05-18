import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  description:
    "This card or page doesn't exist on acoffee. Head back home or make your own coffee card.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col justify-center gap-6 px-4 py-16 sm:px-6 sm:py-20">
      <p className="text-xs font-medium uppercase tracking-wide text-accent">
        404 · Lost in transit
      </p>
      <h1 className="text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
        That page or card doesn&apos;t exist.
      </h1>
      <p className="max-w-xl text-base leading-[1.55] text-ink/70 sm:text-lg">
        Maybe the handle is unclaimed, maybe a link broke, maybe someone
        fat-fingered the URL. Wherever you meant to go, head back to the
        front page — or make your own coffee card while you&apos;re here.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-2xl bg-accent px-5 py-3 text-base font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md"
        >
          <span aria-hidden>←</span>
          Back to home
        </Link>
        <Link
          href="/auth/signin?next=%2Fprofile%3Fonboarding%3D1"
          className="inline-flex items-center gap-2 rounded-2xl border border-bean bg-surface px-5 py-3 text-base font-medium text-ink/85 hover:border-accent/60 hover:text-accent"
        >
          Make your card
          <span aria-hidden>→</span>
        </Link>
      </div>
    </main>
  );
}
