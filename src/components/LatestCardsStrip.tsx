import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import type { LatestCard } from "@/lib/auth-queries";

// Home-page strip: 5 most-recent published cards, rendered as compact tiles
// with avatar + name + city + truncated status. Each tile is a Link to the
// full card. Hides entirely when the feed is empty — better to skip the
// section than show an empty "Latest cards" header that signals "nobody's
// here".
export function LatestCardsStrip({ cards }: { cards: LatestCard[] }) {
  if (cards.length === 0) return null;
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-20 pt-4 sm:px-6 sm:pb-24">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium uppercase tracking-wide text-accent">
          Latest cards
        </p>
        <h2 className="text-2xl font-semibold leading-tight tracking-tight text-ink sm:text-3xl">
          Folks who joined this week.
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
              className="group flex w-full flex-col gap-3 rounded-3xl border border-bean bg-surface p-5 shadow-[0_8px_24px_-18px_rgba(42,31,24,0.25)] transition-shadow hover:border-accent/60 hover:shadow-[0_16px_36px_-22px_rgba(42,31,24,0.35)]"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  handle={c.handle}
                  displayName={c.displayName}
                  src={c.avatarUrl}
                  size="md"
                />
                <div className="flex min-w-0 flex-col">
                  <p className="truncate text-base font-semibold text-ink group-hover:text-accent">
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
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
