import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/lib/i18n";
import { t } from "@/lib/i18n/dict";

export const metadata: Metadata = {
  title: "Page not found",
  description:
    "This card or page doesn't exist on acoffee. Head back home or make your own coffee card.",
  robots: { index: false, follow: false },
};

export default async function NotFound() {
  const locale = await getLocale();
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col justify-center gap-6 px-4 py-16 sm:px-6 sm:py-20">
      <p className="text-xs font-medium uppercase tracking-wide text-accent">
        {t(locale, "notfound.eyebrow")}
      </p>
      <h1 className="text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
        {t(locale, "notfound.h1")}
      </h1>
      <p className="max-w-xl text-base leading-[1.55] text-ink/70 sm:text-lg">
        {t(locale, "notfound.sub")}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-2xl bg-accent px-5 py-3 text-base font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md"
        >
          <span aria-hidden>←</span>
          {t(locale, "notfound.cta.home")}
        </Link>
        <Link
          href="/auth/signin?next=%2Fprofile%3Fonboarding%3D1"
          className="inline-flex items-center gap-2 rounded-2xl border border-bean bg-surface px-5 py-3 text-base font-medium text-ink/85 hover:border-accent/60 hover:text-accent"
        >
          {t(locale, "notfound.cta.make")}
          <span aria-hidden>→</span>
        </Link>
      </div>
    </main>
  );
}
