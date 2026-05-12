import Link from "next/link";
import { SubscribeForm } from "@/components/SubscribeForm";
import type { City } from "@/lib/cities";

export type CityWithActivity = {
  city: City;
  pinCount: number;
  pinsLast24h: number;
  activeCafes?: number;
  workingNow?: number;
};

export function CitiesPanel({ cities }: { cities: CityWithActivity[] }) {
  // Sort: open cities first (they're the actual product), then by pin count
  // descending. Within "building" the highest density is the lead candidate
  // for Phase 2.
  const sorted = [...cities].sort((a, b) => {
    if (a.city.status !== b.city.status) {
      return a.city.status === "open" ? -1 : 1;
    }
    return b.pinCount - a.pinCount;
  });

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-5 border-t border-dashed border-bean px-4 pt-12 sm:px-6 sm:pt-16">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-serif text-3xl font-medium sm:text-4xl">
          Where nomads are right now
        </h2>
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
          By pins · last 30 days
        </p>
      </div>

      <ul className="flex flex-col">
        {sorted.map((row) => (
          <li
            key={row.city.slug}
            className="border-b border-dashed border-bean py-5 last:border-b-0"
          >
            <CityRow row={row} />
          </li>
        ))}
      </ul>

      <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
        Don&apos;t see your city?{" "}
        <Link
          href="#world-map"
          className="underline-offset-4 hover:text-accent hover:underline"
        >
          Drop a pin on the map ↑
        </Link>{" "}
        — that&apos;s how new cities get on the list.
      </p>
    </section>
  );
}

function CityRow({ row }: { row: CityWithActivity }) {
  const { city, pinCount, pinsLast24h, activeCafes, workingNow } = row;
  const isOpen = city.status === "open";
  const isEmpty = pinCount === 0;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-3">
          <h3 className="font-serif text-2xl font-medium">{city.name}</h3>
          <StatusBadge status={city.status} />
          {pinsLast24h > 0 && (
            <span
              className="flex items-center gap-1 font-mono text-[11px] text-accent"
              title={`${pinsLast24h} new pin${pinsLast24h === 1 ? "" : "s"} in the last 24h`}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-accent/60" />
                <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              +{pinsLast24h} today
            </span>
          )}
        </div>
        <p className="font-mono text-xs uppercase tracking-wider text-muted">
          {isEmpty ? (
            <span>🌱 first to land here</span>
          ) : (
            <>
              {pinCount} pin{pinCount === 1 ? "" : "s"}
            </>
          )}
          {isOpen && activeCafes !== undefined && workingNow !== undefined && (
            <>
              <span className="mx-1 text-bean">·</span>
              {workingNow > 0 ? (
                <span className="text-accent">
                  {workingNow} working at {activeCafes} café
                  {activeCafes === 1 ? "" : "s"} now
                </span>
              ) : (
                <span>café directory open</span>
              )}
            </>
          )}
        </p>
      </div>

      <div className="shrink-0">
        {isOpen ? (
          <Link
            href={`/${city.slug}`}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-page hover:bg-accent-hover"
          >
            Enter {city.name} →
          </Link>
        ) : isEmpty ? (
          <Link
            href={`/?focus=${city.slug}#world-map`}
            className="rounded-full border border-accent/60 px-4 py-2 text-sm font-medium text-accent hover:bg-accent-soft"
          >
            Drop the first pin in {city.name} →
          </Link>
        ) : (
          <details className="group">
            <summary className="cursor-pointer list-none rounded-full border border-accent/60 px-4 py-2 text-sm font-medium text-accent hover:bg-accent-soft group-open:bg-accent-soft">
              Notify me when {city.name} opens →
            </summary>
            <div className="mt-3 max-w-sm">
              <SubscribeForm city={city.slug} />
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "open" | "building" }) {
  if (status === "open") {
    return (
      <span className="rounded-full bg-accent px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-page">
        Open
      </span>
    );
  }
  return (
    <span className="rounded-full border border-bean px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
      Building
    </span>
  );
}
