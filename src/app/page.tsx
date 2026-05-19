import type { Metadata } from "next";
import Link from "next/link";
import { LatestCardsStrip } from "@/components/LatestCardsStrip";
import { SampleCard } from "@/components/SampleCard";
import { listLatestCards } from "@/lib/auth-queries";
import { getLocale } from "@/lib/i18n";
import { t, type Locale } from "@/lib/i18n/dict";
import { homeAlternates } from "@/lib/i18n/routes";
import { siteDescription, siteName, siteUrl } from "@/lib/site";

// Refresh the strip once an hour. Card creation isn't bursty enough to
// warrant per-request reads; an hour-stale "latest" is a fair trade for
// keeping the home page CDN-cacheable in between.
export const revalidate = 3600;

export const metadata: Metadata = {
  // hreflang alternates so Google indexes the / / /zh / /ja variants as
  // language equivalents of the same page. /zh/page.tsx and /ja/page.tsx
  // re-export their own metadata pointing back here.
  alternates: homeAlternates("en"),
};

export default async function Home() {
  const locale = await getLocale();
  return <HomeView locale={locale} />;
}

export async function HomeView({ locale }: { locale: Locale }) {
  const latestCards = await listLatestCards(6);
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
          <SampleCard locale={locale} />
        </div>
      </section>

      {/* "Why this exists" — personal narrative tucked between the hero
          and How-it-works. Wrapped in a full-width bg-surface band so
          the page alternates page → surface → page → surface → page
          from hero down, giving each section a clearer edge instead of
          one continuous cream wash. */}
      <div className="w-full border-y border-bean/40 bg-surface">
        <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-sm font-medium uppercase tracking-wide text-accent">
            {t(locale, "home.why.eyebrow")}
          </p>
          <p className="mt-3 font-serif text-2xl italic leading-[1.45] text-ink/85 sm:text-3xl sm:leading-[1.4]">
            {t(locale, "home.why.body")}
          </p>
        </section>
      </div>

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

        <ol className="grid gap-5 sm:grid-cols-3">
          {steps.map((step) => (
            <li
              key={step.n}
              className="group relative isolate flex flex-col gap-4 overflow-hidden rounded-3xl border border-bean bg-surface p-7 shadow-[0_8px_24px_-20px_rgba(42,31,24,0.25)] transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_24px_48px_-24px_rgba(42,31,24,0.4)]"
            >
              {/* Decorative serif numeral sits behind the content. Italic
                  Fraunces in accent at low opacity acts as a visual anchor
                  without competing with the title; deepens on hover so
                  the whole card feels alive. */}
              <span
                aria-hidden
                className="pointer-events-none absolute -right-1 -top-2 select-none font-serif text-[7rem] font-semibold italic leading-none text-accent/15 transition-all duration-500 group-hover:text-accent/30"
              >
                {step.n}
              </span>

              <span
                aria-hidden
                className="origin-left text-3xl transition-transform duration-300 group-hover:scale-110"
              >
                {step.emoji}
              </span>

              <h3 className="relative pr-12 text-xl font-semibold leading-[1.2] tracking-tight text-ink">
                {step.title}
              </h3>
              <p className="relative text-base leading-[1.6] text-ink/75">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Latest cards live on a warm accent wash so the bg-surface
          tiles inside pop forward. The Why section above uses
          bg-surface (matching the tile colour from CardBody), so
          alternating to a warmer band here also keeps the page from
          feeling like one continuous cream. */}
      {latestCards.length > 0 && (
        <div className="w-full border-y border-accent/15 bg-accent-soft/30">
          <LatestCardsStrip cards={latestCards} locale={locale} />
        </div>
      )}

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
