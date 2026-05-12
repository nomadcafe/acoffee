"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import Map, {
  Marker,
  Popup,
  type MapRef,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { quickCheckin } from "@/app/chiang-mai/actions";
import type { Cafe } from "@/lib/types";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

function CoffeeCupPin({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      aria-hidden
      focusable="false"
    >
      <path
        d="M3 7h8.5v3a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7z"
        fill="currentColor"
      />
      <path
        d="M11.5 8h1.2a2 2 0 0 1 0 4h-1.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M5.5 5.2c0-.7.5-1 .5-1.7s-.5-1-.5-1.7M8 5.2c0-.7.5-1 .5-1.7s-.5-1-.5-1.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

type CafesMapProps = {
  cafes: Cafe[];
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  height?: string;
  framed?: boolean;
  activeCounts?: Record<string, number>;
  signedIn?: boolean;
};

export function CafesMap({
  cafes,
  initialCenter = { lat: 18.7883, lng: 98.9853 },
  initialZoom = 12,
  height = "h-72 sm:h-[28rem]",
  framed = true,
  activeCounts,
  signedIn = false,
}: CafesMapProps) {
  const router = useRouter();
  const mapRef = useRef<MapRef | null>(null);
  const [selected, setSelected] = useState<Cafe | null>(null);
  const [checkinPending, startCheckin] = useTransition();
  const [checkinError, setCheckinError] = useState<string | null>(null);

  function handleCheckin(cafe: Cafe) {
    setCheckinError(null);
    startCheckin(async () => {
      const res = await quickCheckin({ kind: "existing", cafeId: cafe.id });
      if (res.ok) {
        router.push(`/chiang-mai/cafes/${res.slug}`);
        router.refresh();
      } else {
        setCheckinError(res.message);
      }
    });
  }

  const onLoad = useCallback(() => {
    if (cafes.length === 0) return;
    const map = mapRef.current;
    if (!map) return;
    const lats = cafes.map((c) => c.lat);
    const lngs = cafes.map((c) => c.lng);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 40, duration: 0 },
    );
  }, [cafes]);

  const selectedActiveCount = selected
    ? activeCounts?.[selected.id] ?? 0
    : 0;

  return (
    <div
      className={`relative w-full overflow-hidden ${framed ? "rounded-2xl border border-bean" : ""} ${height}`}
    >
      <Map
        ref={mapRef}
        initialViewState={{
          latitude: initialCenter.lat,
          longitude: initialCenter.lng,
          zoom: initialZoom,
        }}
        mapStyle={MAP_STYLE}
        onLoad={onLoad}
        style={{ width: "100%", height: "100%" }}
      >
        {cafes.map((cafe) => {
          const activeCount = activeCounts?.[cafe.id] ?? 0;
          return (
            <Marker
              key={cafe.id}
              longitude={cafe.lng}
              latitude={cafe.lat}
              anchor="center"
            >
              <CafeMarkerButton
                cafe={cafe}
                activeCount={activeCount}
                onSelect={(e) => {
                  e.stopPropagation();
                  setSelected(cafe);
                }}
              />
            </Marker>
          );
        })}

        {selected && (
          <Popup
            longitude={selected.lng}
            latitude={selected.lat}
            anchor="top"
            offset={selectedActiveCount > 0 ? 22 : 12}
            closeButton={false}
            closeOnClick
            onClose={() => setSelected(null)}
            className="!p-0"
          >
            <div className="flex flex-col gap-1.5 px-1 py-0.5 text-xs">
              <div className="text-sm font-medium text-ink">
                {selected.name}
              </div>
              {selected.neighborhood && (
                <div className="text-muted">{selected.neighborhood}</div>
              )}
              {selectedActiveCount > 0 && (
                <div className="font-mono text-[11px] font-medium text-accent">
                  {selectedActiveCount}{" "}
                  {selectedActiveCount === 1 ? "nomad" : "nomads"} here now
                </div>
              )}
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                {signedIn ? (
                  <button
                    type="button"
                    onClick={() => handleCheckin(selected)}
                    disabled={checkinPending}
                    className="rounded-full bg-accent px-3 py-1 font-medium text-page hover:bg-accent-hover disabled:opacity-60"
                  >
                    {checkinPending ? "Checking in…" : "Check in here"}
                  </button>
                ) : (
                  <Link
                    href={`/auth/signin?next=/chiang-mai/cafes/${selected.slug}`}
                    className="rounded-full bg-accent px-3 py-1 font-medium text-page hover:bg-accent-hover"
                  >
                    Sign in to check in
                  </Link>
                )}
                <Link
                  href={`/chiang-mai/cafes/${selected.slug}`}
                  className="font-medium text-accent underline-offset-2 hover:underline"
                >
                  View →
                </Link>
              </div>
              {checkinError && (
                <p className="text-[11px] text-red-600 dark:text-red-400">
                  {checkinError}
                </p>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}

function CafeMarkerButton({
  cafe,
  activeCount,
  onSelect,
}: {
  cafe: Cafe;
  activeCount: number;
  onSelect: (e: React.MouseEvent) => void;
}) {
  if (activeCount === 0) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className="block text-accent drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)] transition hover:scale-125"
        aria-label={cafe.name}
      >
        <CoffeeCupPin />
      </button>
    );
  }

  // Active café: bigger cup + pulsing accent ring + count badge top-right.
  return (
    <button
      type="button"
      onClick={onSelect}
      className="relative block text-accent drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition hover:scale-110"
      aria-label={`${cafe.name} — ${activeCount} ${activeCount === 1 ? "nomad" : "nomads"} working here right now`}
    >
      <span
        className="absolute inset-[-6px] animate-ping rounded-full bg-accent/30"
        aria-hidden
      />
      <span className="relative block">
        <CoffeeCupPin size={26} />
      </span>
      <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[10px] font-bold leading-none text-page shadow-sm ring-1 ring-page">
        {activeCount}
      </span>
    </button>
  );
}
