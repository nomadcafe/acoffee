import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { KIND_EMOJI } from "@/components/CardBody";
import type { LatestCard } from "@/lib/auth-queries";
import { type Locale, t } from "@/lib/i18n/dict";

// Home-page strip: 5 most-recent published cards, rendered as compact tiles
// with avatar + name + city + truncated status. Each tile is a Link to the
// full card. Hides entirely when the feed is empty — better to skip the
// section than show an empty "Latest cards" header that signals "nobody's
// here".
export function LatestCardsStrip({
  cards,
  locale,
}: {
  cards: LatestCard[];
  locale: Locale;
}) {
  if (cards.length === 0) return null;
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-20 pt-4 sm:px-6 sm:pb-24">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium uppercase tracking-wide text-accent">
          {t(locale, "latest.eyebrow")}
        </p>
        <h2 className="text-2xl font-semibold leading-tight tracking-tight text-ink sm:text-3xl">
          {t(locale, "latest.h2")}
        </h2>
      </div>
      <ul className="flex flex-wrap gap-4">
        {cards.map((c) => (
          <li
            key={c.handle}
            className="flex w-full min-w-0 sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]"
          >
            <Link
              href={`/${c.handle}`}
              className="group flex w-full flex-col gap-4 rounded-3xl border border-bean bg-surface p-5 shadow-[0_8px_24px_-18px_rgba(42,31,24,0.25)] transition-all duration-300 hover:-translate-y-1 hover:border-accent/60 hover:shadow-[0_24px_44px_-24px_rgba(42,31,24,0.4)]"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  handle={c.handle}
                  displayName={c.displayName}
                  src={c.avatarUrl}
                  size="lg"
                />
                <div className="flex min-w-0 flex-col">
                  <p className="truncate text-lg font-semibold leading-tight text-ink group-hover:text-accent">
                    {c.displayName}
                  </p>
                  <p className="truncate text-sm text-muted">
                    @{c.handle}
                    {c.city ? ` · ${c.city}` : ""}
                  </p>
                </div>
              </div>
              {c.status && (
                <p className="line-clamp-3 text-sm leading-[1.5] text-ink/75">
                  {c.status}
                </p>
              )}
              {c.coffeeChatKinds.length > 0 && (
                // Emoji-only chips so 3-5 kinds still fit one row even
                // on a narrow column. Labels stay on the full /[handle]
                // card; the strip is a "glance" surface.
                <div className="flex flex-wrap items-center gap-1.5">
                  {c.coffeeChatKinds.map((k) => (
                    <span
                      key={k}
                      aria-label={k}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-accent/15 bg-accent-soft text-base"
                    >
                      {KIND_EMOJI[k]}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
