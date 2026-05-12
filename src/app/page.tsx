import Link from "next/link";
import { CitiesPanel, type CityRowData } from "@/components/CitiesPanel";
import { PinMap } from "@/components/PinMap";
import { cities, findCityByName, HOMEPAGE_CITIES } from "@/lib/cities";
import { siteDescription, siteName, siteUrl } from "@/lib/site";
import {
  countPinsGlobal,
  listPins,
  listTopActiveCafes,
  listTopCitiesByPins,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const { focus } = await searchParams;
  const focusedCity = focus && cities[focus] ? cities[focus] : null;

  // Pull pins (for the map), global pin counts (for the strip), and the
  // top-N cities aggregate (for the CitiesPanel) all in parallel.
  const [pins, globalPins, topCityAgg] = await Promise.all([
    listPins(),
    countPinsGlobal(),
    listTopCitiesByPins({ limit: 8 }),
  ]);

  // Build the panel data. For each aggregated city name, try to match a
  // curated City record (Chiang Mai / Bangkok / Lisbon / Bali) — known
  // matches get the full status + cafe activity treatment; everything else
  // surfaces as a discovered row.
  const knownCafeActivity = new Map<string, { activeCafes: number; workingNow: number }>();
  await Promise.all(
    HOMEPAGE_CITIES.filter((c) => c.status === "open").map(async (city) => {
      const topActive = await listTopActiveCafes(city.slug, 50);
      const workingNow = topActive.reduce((s, t) => s + t.activeCount, 0);
      knownCafeActivity.set(city.slug, {
        activeCafes: topActive.length,
        workingNow,
      });
    }),
  );

  // Seed: curated cities that had ZERO pins in the 30-day window won't show
  // up in topCityAgg. Add them explicitly with 0 counts so they're still
  // visible — otherwise a fresh deploy renders an empty panel even though
  // the product is open in Chiang Mai.
  const seenSlugs = new Set<string>();
  const rows: CityRowData[] = [];
  for (const agg of topCityAgg) {
    const known = findCityByName(agg.city);
    if (known) {
      const activity = knownCafeActivity.get(known.slug);
      rows.push({
        kind: "known",
        city: known,
        pinCount: agg.pinCount,
        pinsLast24h: agg.pinsLast24h,
        activeCafes: known.status === "open" ? activity?.activeCafes ?? 0 : undefined,
        workingNow: known.status === "open" ? activity?.workingNow ?? 0 : undefined,
      });
      seenSlugs.add(known.slug);
    } else {
      rows.push({
        kind: "discovered",
        name: agg.city,
        pinCount: agg.pinCount,
        pinsLast24h: agg.pinsLast24h,
      });
    }
  }
  for (const city of HOMEPAGE_CITIES) {
    if (seenSlugs.has(city.slug)) continue;
    const activity = knownCafeActivity.get(city.slug);
    rows.push({
      kind: "known",
      city,
      pinCount: 0,
      pinsLast24h: 0,
      activeCafes: city.status === "open" ? activity?.activeCafes ?? 0 : undefined,
      workingNow: city.status === "open" ? activity?.workingNow ?? 0 : undefined,
    });
  }

  // Total nomads currently working at a café in any OPEN city — the most
  // concrete "the product is alive" number we can show on the home page.
  const workingNowAcrossOpenCities = Array.from(knownCafeActivity.values())
    .reduce((sum, a) => sum + a.workingNow, 0);

  const openCityNames = HOMEPAGE_CITIES
    .filter((c) => c.status === "open")
    .map((c) => c.name);

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    alternateName: "acoffee — soft map for digital nomads",
    url: siteUrl,
    description: siteDescription,
    inLanguage: "en",
  };

  return (
    <main className="flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <section className="mx-auto flex min-h-[88vh] w-full max-w-5xl flex-col justify-center gap-8 px-4 pb-16 pt-20 sm:px-6 sm:pb-24 sm:pt-28">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
          Open source · Check in as you travel
        </p>
        <h1 className="font-display text-[clamp(3.5rem,11vw,9rem)] font-medium leading-[0.92]">
          You just landed.
          <br />
          The first move
          <br />
          is coffee.
        </h1>
        <p className="max-w-2xl text-lg text-muted sm:text-2xl sm:leading-[1.45]">
          acoffee is a soft map for digital nomads. Drop a pin to say you
          arrived. See who&apos;s working at which café right now. Set one
          signal — coffee, cowork, dinner, hike — and meet someone today.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Link
            href="#world-map"
            className="rounded-full bg-accent px-6 py-3 text-base font-medium text-page shadow-sm hover:bg-accent-hover"
          >
            Drop a pin →
          </Link>
          <Link
            href="/chiang-mai"
            className="rounded-full border border-accent/60 px-6 py-3 text-base font-medium text-accent hover:bg-accent-soft"
          >
            Enter Chiang Mai →
          </Link>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-5xl flex-col gap-12 border-t border-dashed border-bean px-4 py-20 sm:px-6 sm:py-28">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-4xl font-medium leading-[1] sm:text-6xl">
            How it works
          </h2>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            Three signals · No chat · No swiping
          </p>
        </div>

        <ol className="grid gap-12 sm:grid-cols-3 sm:gap-10">
          <li className="flex flex-col gap-3 border-t-2 border-accent pt-4">
            <h3 className="font-serif text-2xl font-medium sm:text-3xl">
              Drop a pin when you land
            </h3>
            <p className="text-base text-muted">
              A soft signal that says &ldquo;I&apos;m here.&rdquo; The map
              fills in around you — you&apos;re not the only nomad in town.
            </p>
          </li>
          <li className="flex flex-col gap-3 border-t-2 border-accent pt-4">
            <h3 className="font-serif text-2xl font-medium sm:text-3xl">
              See who&apos;s working where
            </h3>
            <p className="text-base text-muted">
              Real-time check-ins on hand-picked cafés. Walk to the spot
              with 3 other nomads already there. Skip the empty ones.
            </p>
          </li>
          <li className="flex flex-col gap-3 border-t-2 border-accent pt-4">
            <h3 className="font-serif text-2xl font-medium sm:text-3xl">
              Set one signal — meet today
            </h3>
            <p className="text-base text-muted">
              Coffee, cowork, dinner, hike. Pick one. See who&apos;s open.
              Accept a match. Hand off to Telegram or WhatsApp.
            </p>
          </li>
        </ol>
      </section>

      <GlobalStatsStrip
        last24h={globalPins.last24h}
        workingNow={workingNowAcrossOpenCities}
        workingNowCityName={openCityNames[0] ?? null}
      />

      <div id="world-map">
        <PinMap
          initialPins={pins}
          initialCenter={focusedCity?.center}
          initialZoom={focusedCity?.zoom}
          framed={false}
          height="h-[75vh] sm:h-[88vh]"
          emptyLabel={
            focusedCity
              ? `Drop the first pin in ${focusedCity.name}`
              : "Drop the first pin — say you're here"
          }
          globe={!focusedCity}
        />
      </div>

      <CitiesPanel rows={rows} />

      <footer className="mx-auto w-full max-w-5xl px-4 pb-12 pt-16 sm:px-6">
        <div className="flex flex-col gap-3 border-t border-bean pt-6">
          <p className="font-serif text-base italic text-ink/85">
            Made between cafés. If you&apos;re reading this from a new city,
            welcome — drop a pin so the next person doesn&apos;t feel
            so alone.
          </p>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
            acoffee ·{" "}
            <a
              className="underline-offset-2 hover:text-accent hover:underline"
              href="https://github.com/nomadcafe/acoffee"
              target="_blank"
              rel="noreferrer"
            >
              Open source
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}

// "What's fresh / what's live" ribbon between the hero and the map. The map
// itself already carries the cumulative total in its corner chip, so this
// strip stays out of that lane and only shows differentiated signals: recent
// pin activity + live cafe presence. Hides entirely when nothing's fresh —
// the page reads cleaner without a row of zeros.
function GlobalStatsStrip({
  last24h,
  workingNow,
  workingNowCityName,
}: {
  last24h: number;
  workingNow: number;
  workingNowCityName: string | null;
}) {
  const items: { value: number; label: string; pulse?: boolean }[] = [];
  if (last24h > 0) {
    items.push({ value: last24h, label: "pins in the last 24h" });
  }
  if (workingNow > 0 && workingNowCityName) {
    items.push({
      value: workingNow,
      label: `working in ${workingNowCityName} right now`,
      pulse: true,
    });
  }

  if (items.length === 0) return null;

  // Two-up grid when both are present; single centered tile when only one is.
  const gridCols = items.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-1";

  return (
    <section className="mx-auto w-full max-w-5xl border-t border-dashed border-bean px-4 py-10 sm:px-6 sm:py-12">
      <ul className={`grid gap-8 ${gridCols} sm:gap-10`}>
        {items.map((it) => (
          <li key={it.label} className="flex flex-col gap-1.5">
            <p
              className="font-display text-5xl font-medium leading-none tabular-nums sm:text-6xl"
              aria-label={`${it.value} ${it.label}`}
            >
              {it.value.toLocaleString()}
            </p>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
              {it.pulse ? (
                <span className="relative mr-1.5 inline-flex h-1.5 w-1.5 align-middle">
                  <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-accent/60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                </span>
              ) : null}
              {it.label}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
