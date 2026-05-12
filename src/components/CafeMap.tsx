"use client";
import Link from "next/link";
import { useState } from "react";
import Map, { Marker, Popup } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapFallback, MapPlaceholder } from "@/components/MapFallback";
import { useWebglSupported } from "@/lib/webgl";
import type { Cafe } from "@/lib/types";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

type CafeMapProps = {
  lat: number;
  lng: number;
  zoom?: number;
  height?: string;
  ariaLabel?: string;
  // Plan-B layer: cafés within walking distance to give the user a fallback
  // ("if this is full / closed, where's the nearest alternative"). Excludes
  // the focal café upstream.
  nearbyCafes?: Cafe[];
  nearbyActiveCounts?: Record<string, number>;
};

export function CafeMap({
  lat,
  lng,
  zoom = 15,
  height = "h-72 sm:h-96",
  ariaLabel = "Café location",
  nearbyCafes,
  nearbyActiveCounts,
}: CafeMapProps) {
  const [selected, setSelected] = useState<Cafe | null>(null);
  const webgl = useWebglSupported();
  const selectedActiveCount = selected
    ? nearbyActiveCounts?.[selected.id] ?? 0
    : 0;

  if (webgl !== true) {
    return (
      <div
        className={`relative w-full overflow-hidden rounded-2xl border border-bean ${height}`}
        aria-label={ariaLabel}
      >
        {webgl === false ? <MapFallback /> : <MapPlaceholder />}
      </div>
    );
  }

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-bean ${height}`}
      aria-label={ariaLabel}
    >
      <Map
        initialViewState={{ latitude: lat, longitude: lng, zoom }}
        mapStyle={MAP_STYLE}
        style={{ width: "100%", height: "100%" }}
      >
        {/* Focal café — large mark. */}
        <Marker longitude={lng} latitude={lat} anchor="bottom">
          <span
            className="block -translate-y-1/2 text-accent drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]"
            aria-hidden
          >
            <CoffeeCupSvg size={26} />
          </span>
        </Marker>

        {/* Nearby cafés — smaller marks, pulse + count if active. */}
        {nearbyCafes?.map((cafe) => {
          const activeCount = nearbyActiveCounts?.[cafe.id] ?? 0;
          return (
            <Marker
              key={cafe.id}
              longitude={cafe.lng}
              latitude={cafe.lat}
              anchor="center"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(cafe);
                }}
                aria-label={`${cafe.name}${activeCount > 0 ? ` — ${activeCount} ${activeCount === 1 ? "nomad" : "nomads"} working here right now` : ""}`}
                className="relative block text-accent/70 drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)] transition hover:scale-125 hover:text-accent"
              >
                {activeCount > 0 && (
                  <span
                    className="absolute inset-[-4px] animate-ping rounded-full bg-accent/30"
                    aria-hidden
                  />
                )}
                <span className="relative block">
                  <CoffeeCupSvg size={activeCount > 0 ? 18 : 14} />
                </span>
                {activeCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-accent px-1 font-mono text-[9px] font-bold leading-none text-page shadow-sm ring-1 ring-page">
                    {activeCount}
                  </span>
                )}
              </button>
            </Marker>
          );
        })}

        {selected && (
          <Popup
            longitude={selected.lng}
            latitude={selected.lat}
            anchor="top"
            offset={16}
            closeButton={false}
            closeOnClick
            onClose={() => setSelected(null)}
            className="!p-0"
          >
            <div className="flex flex-col gap-1 px-1 py-0.5 text-xs">
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
              <Link
                href={`/chiang-mai/cafes/${selected.slug}`}
                className="mt-1 font-medium text-accent underline-offset-2 hover:underline"
              >
                Go to {selected.name} →
              </Link>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}

function CoffeeCupSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden>
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
