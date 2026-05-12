import type { Metadata } from "next";
import Link from "next/link";
import { CafesMap } from "@/components/CafesMap";
import { getSessionUser } from "@/lib/auth-queries";
import { chiangMai } from "@/lib/cities";
import { listActiveCheckinCounts, listCafes } from "@/lib/store";
import type { Cafe } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cafés in Chiang Mai",
  description:
    "Cafés in Chiang Mai where nomads come back to work. Wi-Fi, outlets, and room to stay — across Nimman, Old City, Santitham, and the East Bank.",
  alternates: { canonical: "/chiang-mai/cafes" },
  openGraph: {
    title: "Cafés in Chiang Mai · acoffee",
    description:
      "Cafés in Chiang Mai where nomads come back to work — across Nimman, Old City, Santitham, and the East Bank.",
    url: "/chiang-mai/cafes",
  },
};

const NEIGHBORHOOD_ORDER = ["Nimman", "Old City", "Santitham", "East Bank", "Hang Dong"];
const BASE_PATH = "/chiang-mai/cafes";

type SearchParams = {
  wifi?: string;
  outlets?: string;
  laptop?: string;
  active?: string;
};
type Filters = {
  wifi: boolean;
  outlets: boolean;
  laptop: boolean;
  active: boolean;
};

function parseFilters(sp: SearchParams): Filters {
  return {
    wifi: sp.wifi === "1",
    outlets: sp.outlets === "1",
    laptop: sp.laptop === "1",
    active: sp.active === "1",
  };
}

function applyFilters(
  cafes: Cafe[],
  f: Filters,
  activeCounts: Record<string, number>,
): Cafe[] {
  return cafes.filter((c) => {
    if (f.wifi && !c.hasWifi) return false;
    if (f.outlets && !c.hasOutlets) return false;
    if (f.laptop && !c.laptopFriendly) return false;
    if (f.active && (activeCounts[c.id] ?? 0) === 0) return false;
    return true;
  });
}

// Toggle one filter on/off while preserving the others.
function toggleHref(f: Filters, key: keyof Filters): string {
  const params = new URLSearchParams();
  for (const k of Object.keys(f) as (keyof Filters)[]) {
    const willBeActive = k === key ? !f[k] : f[k];
    if (willBeActive) params.set(k, "1");
  }
  const q = params.toString();
  return q ? `${BASE_PATH}?${q}` : BASE_PATH;
}

function groupByNeighborhood(cafes: Cafe[]) {
  const groups = new Map<string, Cafe[]>();
  for (const c of cafes) {
    const key = c.neighborhood ?? "Other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }
  return Array.from(groups.entries()).sort(([a], [b]) => {
    const ia = NEIGHBORHOOD_ORDER.indexOf(a);
    const ib = NEIGHBORHOOD_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

export default async function CafesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const filters = parseFilters(await searchParams);
  const anyFilter =
    filters.wifi || filters.outlets || filters.laptop || filters.active;

  const allCafes = await listCafes({ city: "chiang-mai" });
  const [activeCounts, sessionUser] = await Promise.all([
    listActiveCheckinCounts(allCafes.map((c) => c.id)),
    getSessionUser(),
  ]);
  const cafes = anyFilter
    ? applyFilters(allCafes, filters, activeCounts)
    : allCafes;
  const grouped = groupByNeighborhood(cafes);
  const totalActive = Object.values(activeCounts).reduce((a, b) => a + b, 0);

  return (
    <main className="flex flex-col">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pb-8 pt-14 sm:px-6 sm:pb-12 sm:pt-20">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">
          Chiang Mai · Cafés
        </p>
        <h1 className="font-display text-5xl font-medium leading-[1.05] sm:text-7xl">
          Where to work from
          <br />
          in Chiang Mai.
        </h1>
        <p className="max-w-xl text-lg text-muted sm:text-xl">
          {anyFilter
            ? `${cafes.length} of ${allCafes.length} cafés match these filters.`
            : `${allCafes.length} cafés nomads come back to. Wi-Fi, outlets, and room to stay.`}
          {totalActive > 0 && !anyFilter && (
            <>
              {" "}
              <span className="text-accent">
                {totalActive} working right now.
              </span>
            </>
          )}
        </p>
        <div>
          <Link
            href="/chiang-mai"
            className="font-mono text-xs uppercase tracking-widest text-accent underline-offset-4 hover:underline"
          >
            ← Back to Chiang Mai
          </Link>
        </div>
      </section>

      {allCafes.length === 0 ? (
        <div className="mx-auto w-full max-w-5xl px-4 pb-12 sm:px-6">
          <p className="border-t border-dashed border-bean pt-6 text-sm text-muted">
            No cafés loaded yet. If you&apos;re running locally, apply
            <code className="mx-1 rounded bg-bean/40 px-1.5 py-0.5 text-xs">
              supabase/seed_chiang_mai_cafes.sql
            </code>
            or fall back to the in-memory dev seed by clearing Supabase env vars.
          </p>
        </div>
      ) : (
        <>
          <div className="mx-auto w-full max-w-5xl px-4 pb-6 sm:px-6">
            <FilterBar filters={filters} />
          </div>

          {cafes.length === 0 ? (
            <div className="mx-auto w-full max-w-5xl px-4 pb-12 sm:px-6">
              <div className="flex flex-col items-start gap-2 border-t border-dashed border-bean pt-6">
                <p className="text-sm text-muted">No cafés match these filters.</p>
                <Link
                  href={BASE_PATH}
                  className="text-sm font-medium text-accent underline-offset-4 hover:underline"
                >
                  Clear filters
                </Link>
              </div>
            </div>
          ) : (
            <>
              <CafesMap
                cafes={cafes}
                initialCenter={chiangMai.center}
                initialZoom={chiangMai.zoom}
                height="h-72 sm:h-[32rem]"
                framed={false}
                activeCounts={activeCounts}
                signedIn={sessionUser !== null}
              />
              <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
                {grouped.map(([neighborhood, items]) => (
                  <section key={neighborhood} className="flex flex-col gap-5">
                    <h2 className="flex items-baseline gap-3 border-t border-dashed border-bean pt-5 font-serif text-3xl font-medium">
                      {neighborhood}
                      <span className="font-mono text-sm font-normal text-muted">
                        {items.length}
                      </span>
                    </h2>
                    <div className="grid grid-cols-1 gap-px overflow-hidden sm:grid-cols-2 sm:gap-x-8 sm:gap-y-6 lg:grid-cols-3">
                      {items.map((cafe) => (
                        <CafeCard
                          key={cafe.id}
                          cafe={cafe}
                          activeCount={activeCounts[cafe.id] ?? 0}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}

function FilterBar({ filters }: { filters: Filters }) {
  const items: { key: keyof Filters; label: string }[] = [
    { key: "active", label: "Active now" },
    { key: "wifi", label: "Wi-Fi" },
    { key: "outlets", label: "Outlets" },
    { key: "laptop", label: "Laptop-friendly" },
  ];
  const anyActive =
    filters.wifi || filters.outlets || filters.laptop || filters.active;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((it) => {
        const active = filters[it.key];
        return (
          <Link
            key={it.key}
            href={toggleHref(filters, it.key)}
            aria-pressed={active}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-accent text-page hover:bg-accent-hover"
                : "border border-bean text-ink/85 hover:border-accent/60"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
      {anyActive && (
        <Link
          href={BASE_PATH}
          className="ml-1 text-sm font-medium text-muted underline-offset-4 hover:underline"
        >
          Clear
        </Link>
      )}
    </div>
  );
}

function CafeCard({
  cafe,
  activeCount,
}: {
  cafe: Cafe;
  activeCount: number;
}) {
  const tags: string[] = [];
  if (cafe.hasWifi) tags.push("Wi-Fi");
  if (cafe.hasOutlets) tags.push("Outlets");
  if (cafe.laptopFriendly) tags.push("Laptop-friendly");

  return (
    <Link
      href={`/chiang-mai/cafes/${cafe.slug}`}
      className="group flex flex-col gap-2 py-3 transition"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          {cafe.neighborhood && (
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
              {cafe.neighborhood}
            </p>
          )}
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="font-serif text-xl font-medium transition group-hover:text-accent">
              {cafe.name}
            </h3>
            {cafe.submissionStatus === "pending" && (
              <span className="rounded-full bg-accent-soft px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-accent">
                Newly added
              </span>
            )}
          </div>
        </div>
        {activeCount > 0 && (
          <span
            className="flex shrink-0 items-center gap-1 font-mono text-[11px] font-medium text-accent"
            title={`${activeCount} nomad${activeCount === 1 ? "" : "s"} checked in here right now`}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-accent/60" />
              <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            {activeCount} here
          </span>
        )}
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 font-mono text-[11px] text-muted">
          {tags.map((t, i) => (
            <span key={t}>
              {t}
              {i < tags.length - 1 && (
                <span className="ml-2 text-bean">·</span>
              )}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
