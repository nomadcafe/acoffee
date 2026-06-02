import Link from "next/link";
import type { ActiveCity } from "@/lib/auth-queries";
import { t, type Locale } from "@/lib/i18n/dict";
import { cityPath } from "@/lib/i18n/routes";

// Home-page teaser for the city discovery pages: a row of chips for the
// cities that have people around right now, busiest first. Hidden until
// at least one city clears the floor (see listActiveCities) — an empty
// or single-chip row reads as "no one's here" rather than momentum, the
// same reason the latest-cards strip stays hidden at low volume.
//
// Locale-aware hrefs (cityPath) so a visitor on /zh stays under /zh/city.
export function HomeCities({
  cities,
  locale,
}: {
  cities: ActiveCity[];
  locale: Locale;
}) {
  if (cities.length === 0) return null;
  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-4 pt-4 sm:px-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-accent/15 bg-accent-soft/30 p-5 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          {t(locale, "home.cities.h2")}
        </p>
        <div className="flex flex-wrap gap-2">
          {cities.map((c) => (
            <Link
              key={c.slug}
              href={cityPath(c.slug, locale)}
              className="inline-flex items-center gap-2 rounded-full border border-bean bg-surface px-3.5 py-1.5 text-sm font-medium text-ink/85 transition-colors hover:border-accent/60 hover:text-accent"
            >
              <span aria-hidden>📍</span>
              {c.city}
              <span className="rounded-full bg-accent-soft px-1.5 text-xs font-semibold text-accent">
                {c.count}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
