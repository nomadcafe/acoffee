import type { Metadata } from "next";
import Link from "next/link";
import { CityCardRow } from "@/components/CityCardRow";
import { listCityCards } from "@/lib/auth-queries";
import { CITY_INDEX_FLOOR, cityDisplayFromSlug } from "@/lib/city";
import { currentHomeHref, getLocale } from "@/lib/i18n";
import { t, tmpl, type Locale } from "@/lib/i18n/dict";
import { cityAlternates } from "@/lib/i18n/routes";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [cards, locale] = await Promise.all([listCityCards(slug), getLocale()]);
  const cityName = cards[0]?.city ?? cityDisplayFromSlug(slug);
  const title = tmpl(t(locale, "city.meta.title"), { city: cityName });
  const description = tmpl(t(locale, "city.meta.description"), {
    city: cityName,
  });
  return {
    title,
    description,
    alternates: cityAlternates(slug, locale),
    // Thin pages stay out of the index until they fill up.
    robots:
      cards.length < CITY_INDEX_FLOOR
        ? { index: false, follow: true }
        : undefined,
    openGraph: { title, description, type: "website" },
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  return <CityView slug={slug} locale={locale} />;
}

export async function CityView({
  slug,
  locale,
}: {
  slug: string;
  locale: Locale;
}) {
  const [cards, homeHref] = await Promise.all([
    listCityCards(slug),
    currentHomeHref(),
  ]);
  const cityName = cards[0]?.city ?? cityDisplayFromSlug(slug);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-14 sm:px-6 sm:py-20">
      <p className="text-sm font-medium text-muted">
        <Link href={homeHref} className="hover:text-accent">
          acoffee
        </Link>
        <span className="mx-1.5 text-bean">·</span>
        {t(locale, "city.breadcrumb")}
      </p>

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {tmpl(t(locale, "city.h1"), { city: cityName })}
        </h1>
        <p className="text-base leading-[1.55] text-ink/70">
          {cards.length > 0
            ? t(locale, "city.subhead")
            : tmpl(t(locale, "city.empty.body"), { city: cityName })}
        </p>
      </header>

      {cards.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {cards.map((card) => (
            <li key={card.handle}>
              <CityCardRow card={card} locale={locale} />
            </li>
          ))}
        </ul>
      ) : null}

      <footer className="mt-2 flex flex-col gap-3 border-t border-dashed border-bean pt-6">
        <p className="text-sm italic text-ink/70">
          {cards.length > 0
            ? t(locale, "city.footer.note")
            : t(locale, "city.empty.cta.note")}
        </p>
        <Link
          href="/auth/signin?next=%2Fprofile%3Fonboarding%3D1"
          className="inline-flex self-start items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md"
        >
          {t(locale, "hero.cta.makeCard")}
          <span aria-hidden>→</span>
        </Link>
      </footer>
    </main>
  );
}
