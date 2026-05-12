import Link from "next/link";
import { LiveTimeSince } from "@/components/LiveTimeSince";
import type { RecentCheckin } from "@/lib/store";

export function ActivityFeed({
  items,
  cityName,
}: {
  items: RecentCheckin[];
  cityName: string;
}) {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 border-t border-dashed border-bean px-4 pt-12 sm:px-6 sm:pt-16">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-serif text-2xl font-medium sm:text-3xl">
          Latest activity
        </h2>
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
          Last {items.length} check-in{items.length === 1 ? "" : "s"}
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-base text-muted">
          No one&apos;s checked in yet today. Be the one who shows up — drop
          your own check-in above and {cityName}&apos;s feed has its first beat.
        </p>
      ) : (
        <ul className="flex flex-col">
          {items.map((item, i) => (
            <li
              key={`${item.createdAt}-${i}`}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-dashed border-bean py-3 last:border-b-0"
            >
              <span className="text-base text-ink/85">
                <span className="font-mono text-sm text-muted">@</span>
                <span className="font-medium">{item.handle}</span>{" "}
                <span className="text-muted">checked in at</span>{" "}
                <Link
                  href={`/chiang-mai/cafes/${item.cafeSlug}`}
                  className="font-serif text-lg font-medium text-ink underline-offset-4 hover:text-accent hover:underline"
                >
                  {item.cafeName}
                </Link>
              </span>
              <LiveTimeSince
                createdAt={item.createdAt}
                suffix=" ago"
                className="font-mono text-xs text-muted"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
