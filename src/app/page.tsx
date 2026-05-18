import Link from "next/link";
import { LatestCardsStrip } from "@/components/LatestCardsStrip";
import { SampleCard } from "@/components/SampleCard";
import { listLatestCards } from "@/lib/auth-queries";
import { getLocale } from "@/lib/i18n";
import { t } from "@/lib/i18n/dict";
import { siteDescription, siteName, siteUrl } from "@/lib/site";

// Refresh the strip once an hour. Card creation isn't bursty enough to
// warrant per-request reads; an hour-stale "latest" is a fair trade for
// keeping the home page CDN-cacheable in between.
export const revalidate = 3600;

export default async function Home() {
  const [latestCards, locale] = await Promise.all([
    listLatestCards(6),
    getLocale(),
  ]);
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    alternateName: "acoffee — coffee in bio",
    url: siteUrl,
    description: siteDescription,
    inLanguage: locale,
  };

  const steps = [
    {
      n: "1",
      emoji: "✋",
      title: t(locale, "how.step1.title"),
      body: (
        <>
          {t(locale, "how.step1.body.pre")}
          <span className="font-medium text-ink">
            acoffee.com/{`{handle}`}
          </span>
          {t(locale, "how.step1.body.post")}
        </>
      ),
    },
    {
      n: "2",
      emoji: "📝",
      title: t(locale, "how.step2.title"),
      body: <>{t(locale, "how.step2.body")}</>,
    },
    {
      n: "3",
      emoji: "☕",
      title: t(locale, "how.step3.title"),
      body: (
        <>
          {t(locale, "how.step3.body.pre")}
          <span className="font-medium text-ink">
            {t(locale, "how.step3.body.quoted")}
          </span>
          {t(locale, "how.step3.body.post")}
        </>
      ),
    },
  ];

  return (
    <main className="flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-24">
        <div className="flex flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
            <span aria-hidden>☕</span>
            {t(locale, "hero.eyebrow")}
          </span>
          <h1 className="text-[clamp(2.75rem,6.5vw,5.25rem)] font-semibold leading-[1] tracking-tight text-ink">
            {t(locale, "hero.h1")}
          </h1>
          <p className="max-w-xl text-lg leading-[1.55] text-ink/70 sm:text-xl">
            {t(locale, "hero.sub.pre")}
            <span className="font-medium text-ink">
              acoffee.com/{`{handle}`}
            </span>
            {t(locale, "hero.sub.post")}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/auth/signin?next=%2Fprofile%3Fonboarding%3D1"
              className="inline-flex items-center gap-2 rounded-2xl bg-accent px-5 py-3 text-base font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md"
            >
              {t(locale, "hero.cta.makeCard")}
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-1 rounded-2xl px-4 py-3 text-base font-medium text-ink/80 hover:text-accent"
            >
              {t(locale, "hero.cta.howItWorks")}
            </Link>
          </div>
        </div>
        <div className="lg:pt-2">
          <SampleCard />
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-20 sm:px-6 sm:py-24"
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium uppercase tracking-wide text-accent">
            {t(locale, "how.eyebrow")}
          </p>
          <h2 className="text-3xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-4xl">
            {t(locale, "how.h2")}
          </h2>
        </div>

        <ol className="grid gap-6 sm:grid-cols-3 sm:gap-6">
          {steps.map((step) => (
            <li
              key={step.n}
              className="flex flex-col gap-4 rounded-2xl border border-bean bg-surface p-6 shadow-[0_8px_24px_-18px_rgba(42,31,24,0.25)]"
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="grid h-10 w-10 place-items-center rounded-2xl bg-accent-soft text-xl"
                >
                  {step.emoji}
                </span>
                <span className="text-sm font-medium text-muted">
                  {t(locale, "how.step.label")} {step.n}
                </span>
              </div>
              <h3 className="text-xl font-semibold tracking-tight text-ink">
                {step.title}
              </h3>
              <p className="text-base leading-[1.55] text-ink/75">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <LatestCardsStrip cards={latestCards} locale={locale} />

      <section className="mx-auto w-full max-w-5xl px-4 pb-12 pt-8 sm:px-6">
        <div className="border-t border-bean pt-6">
          <p className="font-serif text-base italic text-ink/85">
            {t(locale, "homeFooter.signature")}
          </p>
        </div>
      </section>
    </main>
  );
}
