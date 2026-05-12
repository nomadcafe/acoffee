import Link from "next/link";
import { SubscribeForm } from "@/components/SubscribeForm";
import type { City } from "@/lib/cities";

// Row data is a tagged union: a "known" row carries the full City record
// (bbox, status, etc.) which unlocks the Enter / Subscribe CTAs; a
// "discovered" row only has the raw Nominatim city name + pin counts.
// Discovered rows are the cities the data brought in that we haven't
// curated — they get a generic "drop a pin / be the first" CTA.
export type KnownCityRow = {
  kind: "known";
  city: City;
  pinCount: number;
  pinsLast24h: number;
  activeCafes?: number;
  workingNow?: number;
};

export type DiscoveredCityRow = {
  kind: "discovered";
  name: string;
  pinCount: number;
  pinsLast24h: number;
};

export type CityRowData = KnownCityRow | DiscoveredCityRow;

export function CitiesPanel({ rows }: { rows: CityRowData[] }) {
  // Pure pin-count sort. Title is 'Where nomads are right now' — the answer
  // is data, not which city we happen to have a product page in. Open vs
  // building shows on the status badge, and 'Enter X →' still lives on
  // open rows regardless of position, so funnel intent isn't lost.
  const sorted = [...rows].sort((a, b) => b.pinCount - a.pinCount);

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

      {sorted.length === 0 ? (
        <p className="text-sm text-muted">
          No pins yet.{" "}
          <Link
            href="#world-map"
            className="font-medium text-accent underline-offset-4 hover:underline"
          >
            Drop the first one ↑
          </Link>
        </p>
      ) : (
        <ul className="flex flex-col">
          {sorted.map((row) => (
            <li
              key={rowKey(row)}
              className="border-b border-dashed border-bean py-5 last:border-b-0"
            >
              <CityRow row={row} />
            </li>
          ))}
        </ul>
      )}

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

function rowKey(row: CityRowData): string {
  return row.kind === "known" ? `k:${row.city.slug}` : `d:${row.name}`;
}

function CityRow({ row }: { row: CityRowData }) {
  if (row.kind === "known") return <KnownRow row={row} />;
  return <DiscoveredRow row={row} />;
}

function KnownRow({ row }: { row: KnownCityRow }) {
  const { city, pinCount, pinsLast24h, activeCafes, workingNow } = row;
  const isOpen = city.status === "open";
  const isEmpty = pinCount === 0;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-3">
          <h3 className="font-serif text-2xl font-medium">{city.name}</h3>
          <StatusBadge status={city.status} />
          {pinsLast24h > 0 && <RecencyDot count={pinsLast24h} />}
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

// Discovered city: we know its name from reverse-geocoded pins but have no
// curated page / bbox. Show name + activity, offer generic subscribe so we
// can capture demand for cities we don't yet serve.
function DiscoveredRow({ row }: { row: DiscoveredCityRow }) {
  const { name, pinCount, pinsLast24h } = row;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-3">
          <h3 className="font-serif text-2xl font-medium">{name}</h3>
          <span className="rounded-full border border-dashed border-bean px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
            New
          </span>
          {pinsLast24h > 0 && <RecencyDot count={pinsLast24h} />}
        </div>
        <p className="font-mono text-xs uppercase tracking-wider text-muted">
          {pinCount} pin{pinCount === 1 ? "" : "s"} · demand signal, no
          product yet
        </p>
      </div>

      <div className="shrink-0">
        <details className="group">
          <summary className="cursor-pointer list-none rounded-full border border-accent/60 px-4 py-2 text-sm font-medium text-accent hover:bg-accent-soft group-open:bg-accent-soft">
            Notify me when {name} opens →
          </summary>
          <div className="mt-3 max-w-sm">
            <SubscribeForm city={slugify(name)} />
          </div>
        </details>
      </div>
    </div>
  );
}

function RecencyDot({ count }: { count: number }) {
  return (
    <span
      className="flex items-center gap-1 font-mono text-[11px] text-accent"
      title={`${count} new pin${count === 1 ? "" : "s"} in the last 24h`}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inset-0 animate-ping rounded-full bg-accent/60" />
        <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-accent" />
      </span>
      +{count} today
    </span>
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

// City name → subscribe tag. Stays in this file because it's only the
// CitiesPanel that needs it; if other surfaces ever need to subscribe by
// discovered city, promote to lib/.
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
