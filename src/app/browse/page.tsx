import type { Metadata } from "next";
import Link from "next/link";
import { KIND_EMOJI } from "@/components/CardBody";
import { CityCardRow } from "@/components/CityCardRow";
import {
  listActiveCities,
  listActiveInterests,
  listBrowseCards,
} from "@/lib/auth-queries";
import { normaliseInterest } from "@/lib/interests";
import { currentHomeHref, getLocale } from "@/lib/i18n";
import { t, tmpl, type Locale } from "@/lib/i18n/dict";
import { browseAlternates, browsePath } from "@/lib/i18n/routes";
import { COFFEE_CHAT_KINDS, type CoffeeChatKind } from "@/lib/types";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return browseMeta(locale);
}

export function browseMeta(locale: Locale): Metadata {
  const title = t(locale, "browse.meta.title");
  const description = t(locale, "browse.meta.description");
  return {
    title,
    description,
    alternates: browseAlternates(locale),
    openGraph: { title, description, type: "website" },
  };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const locale = await getLocale();
  return <BrowseView locale={locale} searchParams={searchParams} />;
}

export async function BrowseView({
  locale,
  searchParams,
}: {
  locale: Locale;
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined): string | undefined =>
    typeof v === "string" && v.trim() !== "" ? v.trim() : undefined;

  const city = one(sp.city);
  const kindRaw = one(sp.kind);
  const kind = (COFFEE_CHAT_KINDS as readonly string[]).includes(kindRaw ?? "")
    ? (kindRaw as CoffeeChatKind)
    : undefined;
  // Normalise the interest param the same way we stored it, so a hand-
  // typed ?interest=Trail%20Running still matches the slug in the column.
  const interest = kindFreeInterest(one(sp.interest));
  const q = one(sp.q)?.slice(0, 80);

  const filters = { city, kind, interest, q };
  const hasFilter = !!(city || kind || interest || q);

  const [cards, cities, interests, homeHref] = await Promise.all([
    listBrowseCards(filters),
    listActiveCities(12),
    listActiveInterests(18),
    currentHomeHref(),
  ]);

  const base = browsePath(locale);

  // Build an href that toggles one filter key while preserving the rest.
  // Clicking an already-active value clears it; a new value replaces it.
  function hrefFor(key: "city" | "kind" | "interest", value: string): string {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (city) next.set("city", city);
    if (kind) next.set("kind", kind);
    if (interest) next.set("interest", interest);
    if (next.get(key) === value) next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    return qs ? `${base}?${qs}` : base;
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-14 sm:px-6 sm:py-20">
      <p className="text-sm font-medium text-muted">
        <Link href={homeHref} className="hover:text-accent">
          acoffee
        </Link>
        <span className="mx-1.5 text-bean">·</span>
        {t(locale, "browse.breadcrumb")}
      </p>

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {t(locale, "browse.h1")}
        </h1>
        <p className="text-base leading-[1.55] text-ink/70">
          {t(locale, "browse.subhead")}
        </p>
      </header>

      {/* Filter bar. Everything is a server-rendered <Link> or a GET
          <form>, so the page works with no client JS. */}
      <section className="flex flex-col gap-4 rounded-3xl border border-bean bg-surface/60 p-5">
        <form action={base} method="get" className="flex gap-2">
          {/* Preserve the active facet filters when running a text search. */}
          {city && <input type="hidden" name="city" value={city} />}
          {kind && <input type="hidden" name="kind" value={kind} />}
          {interest && (
            <input type="hidden" name="interest" value={interest} />
          )}
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder={t(locale, "browse.search.placeholder")}
            className="h-10 min-w-0 flex-1 rounded-xl border border-bean bg-surface px-3 text-base text-ink outline-none sm:text-sm focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <button
            type="submit"
            className="inline-flex shrink-0 items-center rounded-2xl bg-accent px-4 py-2 text-sm font-medium text-page shadow-sm hover:bg-accent-hover hover:shadow-md"
          >
            {t(locale, "browse.search.submit")}
          </button>
        </form>

        {cities.length > 0 && (
          <FilterRow label={t(locale, "browse.filter.city")}>
            {cities.map((c) => (
              <FilterChip
                key={c.slug}
                href={hrefFor("city", c.slug)}
                active={city === c.slug}
                label={c.city}
              />
            ))}
          </FilterRow>
        )}

        <FilterRow label={t(locale, "browse.filter.kind")}>
          {COFFEE_CHAT_KINDS.map((k) => (
            <FilterChip
              key={k}
              href={hrefFor("kind", k)}
              active={kind === k}
              label={`${KIND_EMOJI[k]} ${t(locale, `profile.kind.${k}` as const)}`}
            />
          ))}
        </FilterRow>

        {interests.length > 0 && (
          <FilterRow label={t(locale, "browse.filter.interests")}>
            {interests.map((i) => (
              <FilterChip
                key={i.interest}
                href={hrefFor("interest", i.interest)}
                active={interest === i.interest}
                label={`#${i.interest}`}
              />
            ))}
          </FilterRow>
        )}

        {hasFilter && (
          <Link
            href={base}
            className="self-start text-sm font-medium text-accent hover:underline"
          >
            {t(locale, "browse.clear")}
          </Link>
        )}
      </section>

      {cards.length > 0 ? (
        <>
          <p className="text-sm text-muted">
            {tmpl(t(locale, "browse.count"), {
              n: cards.length,
              plural: cards.length === 1 ? "" : "s",
            })}
          </p>
          <ul className="flex flex-col gap-3">
            {cards.map((card) => (
              <li key={card.handle}>
                <CityCardRow card={card} locale={locale} />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="rounded-3xl border border-dashed border-bean bg-surface/40 p-6 text-sm italic text-ink/70">
          {t(locale, "browse.empty")}
        </p>
      )}
    </main>
  );
}

// Normalise a raw interest query param to the stored slug shape (or
// undefined). Named distinctly so the import stays a single helper.
function kindFreeInterest(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  return normaliseInterest(raw) ?? undefined;
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-accent">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "inline-flex items-center rounded-full border border-accent bg-accent px-3 py-1 text-xs font-medium text-page"
          : "inline-flex items-center rounded-full border border-bean bg-surface px-3 py-1 text-xs font-medium text-ink/70 hover:border-accent/60 hover:bg-accent-soft hover:text-accent"
      }
    >
      {label}
    </Link>
  );
}
