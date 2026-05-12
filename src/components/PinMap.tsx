"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Marker,
  Popup,
  type MapRef,
  type ViewStateChangeEvent,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import Supercluster, {
  type ClusterFeature,
  type PointFeature,
} from "supercluster";
import Link from "next/link";
import { MapFallback, MapPlaceholder } from "@/components/MapFallback";
import { SubscribeForm } from "@/components/SubscribeForm";
import { findCityByLatLng, type City } from "@/lib/cities";
import { friendlyGeoError } from "@/lib/geo-errors";
import { useWebglSupported } from "@/lib/webgl";
import type { Cafe, Pin } from "@/lib/types";
import { timeAgo } from "@/lib/time-ago";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
const DAY_MS = 24 * 60 * 60 * 1000;
const NEARBY_RADIUS_KM = 50;
const NEARBY_ZOOM = 10;

function wrapLng(lng: number): number {
  let v = lng;
  while (v > 180) v -= 360;
  while (v < -180) v += 360;
  return v;
}

function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function CoffeeCupPin() {
  // Tiny espresso cup glyph rendered in `currentColor`, sized to read at map zoom.
  return (
    <svg
      width="18"
      height="18"
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

type LeafProps = { pinId: string; nickname: string | null; createdAt: string };

type PinMapProps = {
  initialPins: Pin[];
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  countSuffix?: string;
  emptyLabel?: string;
  height?: string;
  framed?: boolean;
  showNearMe?: boolean;
  // Optional overlay: active cafés to highlight as prominent markers on top
  // of the anonymous pin layer. Drop in only the cafés you want shown
  // (typically `activeCount > 0` filtered upstream).
  activeCafes?: Array<{ cafe: Cafe; activeCount: number }>;
  // Whether the floating "drop an anonymous pin" form is rendered inside the
  // map. False on city pages where the city-aware QuickCheckin lives below
  // the map and an anonymous pin would just confuse users.
  showDropPin?: boolean;
  // Render as a slowly-rotating 3D globe instead of a flat Mercator. Intended
  // for the homepage hero only — zoomed-in city views look better flat.
  globe?: boolean;
};

// Ambient rotation: 360° per 120s = 3°/s = 0.05°/frame at 60fps.
const GLOBE_ROTATE_DEG_PER_SEC = 3;
const GLOBE_RESUME_AFTER_MS = 30_000;

export function PinMap({
  initialPins,
  initialCenter = { lat: 20, lng: 10 },
  initialZoom = 1.4,
  countSuffix = "on the map",
  emptyLabel,
  height = "h-[60vh] sm:h-[70vh]",
  framed = true,
  showNearMe = true,
  activeCafes,
  showDropPin = true,
  globe = false,
}: PinMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [pins, setPins] = useState<Pin[]>(initialPins);
  const [last24h, setLast24h] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  // Remember where the user just dropped so the post-drop panel can route
  // them by city (open / building / outside coverage).
  const [lastDrop, setLastDrop] = useState<{ lat: number; lng: number } | null>(null);
  const [nickname, setNickname] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<Pin | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [viewState, setViewState] = useState({
    longitude: initialCenter.lng,
    latitude: initialCenter.lat,
    zoom: initialZoom,
  });
  const [bounds, setBounds] = useState<[number, number, number, number]>([
    -180, -85, 180, 85,
  ]);
  const webgl = useWebglSupported();

  // Ambient globe rotation: only when `globe`, paused on user interaction,
  // resumes 30s after the last interaction. Uses rAF for smooth motion and
  // ties directly to viewState so the controlled <Map> stays in sync.
  const rotationRef = useRef<{
    paused: boolean;
    lastInteractAt: number;
    rafId: number | null;
    lastTime: number;
  }>({ paused: false, lastInteractAt: 0, rafId: null, lastTime: 0 });

  useEffect(() => {
    if (!globe) return;
    const state = rotationRef.current;

    const tick = (t: number) => {
      const last = state.lastTime || t;
      const dtSec = Math.min(0.1, (t - last) / 1000);
      state.lastTime = t;

      const idle =
        state.lastInteractAt === 0 ||
        t - state.lastInteractAt > GLOBE_RESUME_AFTER_MS;
      if (idle && !state.paused) {
        setViewState((s) => ({
          ...s,
          longitude: wrapLng(s.longitude + GLOBE_ROTATE_DEG_PER_SEC * dtSec),
        }));
      }
      state.rafId = requestAnimationFrame(tick);
    };
    state.rafId = requestAnimationFrame(tick);
    return () => {
      if (state.rafId !== null) cancelAnimationFrame(state.rafId);
      state.rafId = null;
      state.lastTime = 0;
    };
  }, [globe]);

  const onInteract = useCallback(() => {
    rotationRef.current.lastInteractAt = performance.now();
  }, []);

  const visiblePins = useMemo(() => {
    if (!last24h) return pins;
    const cutoff = Date.now() - DAY_MS;
    return pins.filter((p) => new Date(p.createdAt).getTime() >= cutoff);
  }, [pins, last24h]);

  const nearbyCount = useMemo(() => {
    if (!userLocation) return null;
    return visiblePins.filter(
      (p) =>
        distanceKm(userLocation.lat, userLocation.lng, p.lat, p.lng) <=
        NEARBY_RADIUS_KM,
    ).length;
  }, [visiblePins, userLocation]);

  const supercluster = useMemo(() => {
    const sc = new Supercluster<LeafProps>({ radius: 60, maxZoom: 14 });
    const points: PointFeature<LeafProps>[] = visiblePins.map((p) => ({
      type: "Feature",
      properties: { pinId: p.id, nickname: p.nickname, createdAt: p.createdAt },
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
    }));
    sc.load(points);
    return sc;
  }, [visiblePins]);

  const clusters = useMemo(
    () => supercluster.getClusters(bounds, Math.round(viewState.zoom)),
    [supercluster, bounds, viewState.zoom],
  );

  const onMove = useCallback((e: ViewStateChangeEvent) => {
    setViewState({
      longitude: e.viewState.longitude,
      latitude: e.viewState.latitude,
      zoom: e.viewState.zoom,
    });
    const b = e.target.getBounds();
    if (b) {
      setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    }
  }, []);

  const onLoad = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const b = map.getBounds();
    if (b) {
      setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    }
  }, []);

  const expandCluster = useCallback(
    (clusterId: number, lng: number, lat: number) => {
      const zoom = Math.min(
        supercluster.getClusterExpansionZoom(clusterId),
        16,
      );
      mapRef.current?.flyTo({ center: [lng, lat], zoom, duration: 500 });
    },
    [supercluster],
  );

  function requestNearMe() {
    setNearbyError(null);
    if (!("geolocation" in navigator)) {
      setNearbyError("Your browser does not support geolocation.");
      return;
    }
    setNearbyLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ lat, lng });
        setNearbyLoading(false);
        mapRef.current?.flyTo({
          center: [lng, lat],
          zoom: NEARBY_ZOOM,
          duration: 800,
        });
      },
      (err) => {
        setNearbyError(friendlyGeoError(err));
        setNearbyLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  function dropPin() {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("Your browser does not support geolocation.");
      return;
    }
    setSubmitting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void submit(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setError(friendlyGeoError(err));
        setSubmitting(false);
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  async function submit(lat: number, lng: number) {
    try {
      const res = await fetch("/api/pins", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lat,
          lng,
          nickname: nickname.trim() || undefined,
          website: website || undefined,
        }),
      });
      const json = (await res.json()) as { pin?: Pin; error?: string };
      if (res.status === 429) {
        throw new Error("Too many submissions. Try again later.");
      }
      if (!res.ok || !json.pin) throw new Error(json.error || "failed");
      setPins((prev) => [json.pin!, ...prev]);
      setLastDrop({ lat, lng });
      setDone(true);
      mapRef.current?.flyTo({ center: [lng, lat], zoom: 12, duration: 700 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to save pin");
    } finally {
      setSubmitting(false);
    }
  }

  const count = visiblePins.length;
  const baseLabel =
    count === 0 && emptyLabel
      ? emptyLabel
      : `${count} nomad${count === 1 ? "" : "s"} ${countSuffix}`;
  const globalLabel = last24h && count > 0 ? `${baseLabel} · last 24h` : baseLabel;
  const nearbyLabel =
    nearbyCount !== null
      ? `${nearbyCount} nomad${nearbyCount === 1 ? "" : "s"} within ${NEARBY_RADIUS_KM}km${last24h ? " · last 24h" : ""}`
      : null;
  const label = nearbyLabel ?? globalLabel;

  if (webgl !== true) {
    return (
      <div
        className={`relative w-full overflow-hidden ${framed ? "rounded-2xl border border-bean" : ""} ${height}`}
      >
        {webgl === false ? <MapFallback /> : <MapPlaceholder />}
        {webgl === false && (
          <div className="pointer-events-none absolute left-4 top-4 z-10">
            <span className="rounded-full bg-surface/90 px-3 py-1.5 text-sm font-medium text-ink/85 shadow-sm backdrop-blur dark:bg-black/70 dark:text-ink">
              {label}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative w-full overflow-hidden ${framed ? "rounded-2xl border border-bean" : ""} ${height}`}
    >
      <Map
        ref={mapRef}
        {...viewState}
        onMove={onMove}
        onLoad={onLoad}
        onMouseDown={globe ? onInteract : undefined}
        onTouchStart={globe ? onInteract : undefined}
        onWheel={globe ? onInteract : undefined}
        mapStyle={MAP_STYLE}
        projection={globe ? { type: "globe" } : undefined}
        style={{ width: "100%", height: "100%" }}
      >
        {clusters.map((c) => {
          const [lng, lat] = c.geometry.coordinates;
          const cluster = c as ClusterFeature<LeafProps>;
          if (cluster.properties.cluster) {
            const size = Math.min(
              28 + Math.sqrt(cluster.properties.point_count) * 6,
              60,
            );
            return (
              <Marker
                key={`c-${cluster.id}`}
                longitude={lng}
                latitude={lat}
                anchor="center"
              >
                <button
                  onClick={() =>
                    expandCluster(cluster.id as number, lng, lat)
                  }
                  className="flex items-center justify-center rounded-full bg-accent/90 font-semibold text-white shadow-md ring-2 ring-white transition hover:bg-accent"
                  style={{ width: size, height: size, fontSize: size > 40 ? 14 : 12 }}
                  aria-label={`${cluster.properties.point_count} nomads here, click to zoom`}
                >
                  {cluster.properties.point_count_abbreviated}
                </button>
              </Marker>
            );
          }
          const leaf = c as PointFeature<LeafProps>;
          const pin: Pin = {
            id: leaf.properties.pinId,
            lat,
            lng,
            nickname: leaf.properties.nickname,
            createdAt: leaf.properties.createdAt,
          };
          return (
            <Marker
              key={`p-${pin.id}`}
              longitude={lng}
              latitude={lat}
              anchor="center"
            >
              <button
                onMouseEnter={() => setHovered(pin)}
                onMouseLeave={() =>
                  setHovered((h) => (h?.id === pin.id ? null : h))
                }
                onClick={() => setHovered(pin)}
                className="block text-accent drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)] transition hover:scale-125"
                aria-label={pin.nickname ?? "Anonymous nomad"}
              >
                <CoffeeCupPin />
              </button>
            </Marker>
          );
        })}

        {activeCafes?.map(({ cafe, activeCount }) => (
          <Marker
            key={`cafe-${cafe.id}`}
            longitude={cafe.lng}
            latitude={cafe.lat}
            anchor="center"
          >
            <Link
              href={`/chiang-mai/cafes/${cafe.slug}`}
              aria-label={`${cafe.name} — ${activeCount} ${activeCount === 1 ? "nomad" : "nomads"} working here right now`}
              className="relative block text-accent drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition hover:scale-110"
            >
              <span
                className="absolute inset-[-6px] animate-ping rounded-full bg-accent/30"
                aria-hidden
              />
              <span className="relative block">
                <svg width="26" height="26" viewBox="0 0 18 18" aria-hidden>
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
              </span>
              <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[10px] font-bold leading-none text-page shadow-sm ring-1 ring-page">
                {activeCount}
              </span>
            </Link>
          </Marker>
        ))}

        {hovered && (
          <Popup
            longitude={hovered.lng}
            latitude={hovered.lat}
            anchor="top"
            offset={12}
            closeButton={false}
            closeOnClick={false}
            onClose={() => setHovered(null)}
            className="!p-0"
          >
            <div className="px-1 py-0.5 text-xs">
              <div className="font-medium text-ink">
                {hovered.nickname ?? "Anonymous nomad"}
              </div>
              <div className="text-muted">{timeAgo(hovered.createdAt)}</div>
            </div>
          </Popup>
        )}

        {userLocation && (
          <Marker
            longitude={userLocation.lng}
            latitude={userLocation.lat}
            anchor="center"
          >
            <span className="relative block h-3 w-3" aria-label="You are here">
              <span className="absolute inset-0 animate-ping rounded-full bg-accent/40" />
              <span className="absolute inset-0 rounded-full bg-accent ring-2 ring-page" />
            </span>
          </Marker>
        )}
      </Map>

      <div className="absolute left-4 top-4 z-10 flex flex-col items-start gap-1">
        <span className="pointer-events-none rounded-full bg-surface/90 px-3 py-1.5 text-sm font-medium text-ink/85 shadow-sm backdrop-blur dark:bg-black/70 dark:text-ink">
          {label}
        </span>
        {userLocation && (
          <button
            onClick={() => {
              setUserLocation(null);
              setNearbyError(null);
            }}
            className="font-mono text-[10px] uppercase tracking-widest text-muted underline-offset-4 hover:text-accent hover:underline"
          >
            ← Back to global
          </button>
        )}
      </div>

      <div className="absolute right-4 top-4 z-10 flex flex-col items-end gap-2">
        {showNearMe && !userLocation && (
          <button
            onClick={requestNearMe}
            disabled={nearbyLoading}
            className="rounded-full bg-accent px-3 py-1.5 text-sm font-medium text-page shadow-sm transition hover:bg-accent-hover disabled:opacity-60"
          >
            {nearbyLoading ? "Locating…" : "📍 Near me"}
          </button>
        )}
        <button
          onClick={() => setLast24h((v) => !v)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium shadow-sm backdrop-blur transition ${
            last24h
              ? "bg-accent text-page hover:bg-accent-hover"
              : "bg-surface/90 text-ink/85 hover:bg-surface dark:bg-black/70 dark:text-ink"
          }`}
          aria-pressed={last24h}
        >
          Last 24h
        </button>
        {nearbyError && (
          <span className="max-w-[180px] rounded-md bg-surface/95 px-2 py-1 text-right text-[11px] text-red-600 shadow-sm backdrop-blur dark:bg-black/70 dark:text-red-400">
            {nearbyError}
          </span>
        )}
      </div>

      {showDropPin && (
      <div className="absolute bottom-4 left-1/2 z-10 w-[min(92vw,520px)] -translate-x-1/2 rounded-2xl border border-bean bg-surface/95 p-3 shadow-lg backdrop-blur">
        {done ? (
          <PostDropPanel
            drop={lastDrop}
            onDropAnother={() => {
              setDone(false);
              setLastDrop(null);
              setError(null);
            }}
          />
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Nickname (optional)"
              maxLength={40}
              className="flex-1 rounded-full border border-bean bg-surface px-4 py-2 text-sm outline-none focus:border-accent dark:bg-bean/40"
            />
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              name="website"
              className="absolute -left-[9999px] top-0 h-0 w-0 opacity-0"
            />
            <button
              onClick={dropPin}
              disabled={submitting}
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
            >
              {submitting ? "Locating…" : "I'm here"}
            </button>
          </div>
        )}
        {error && (
          <p className="mt-2 px-2 text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
      )}
    </div>
  );
}

// After-drop CTA. Routes the user somewhere meaningful based on where they
// physically are: an open city → the product; a building city → its
// subscribe list; outside coverage → a generic "we open city by city" form.
// Replaces the previous dead-end "you're on the map" message.
function PostDropPanel({
  drop,
  onDropAnother,
}: {
  drop: { lat: number; lng: number } | null;
  onDropAnother: () => void;
}) {
  const city = drop ? findCityByLatLng(drop.lat, drop.lng) : null;

  return (
    <div className="flex flex-col gap-3 px-2 py-1 text-sm text-ink/85">
      <p className="text-center">
        You&apos;re on the map
        {city ? <> · in <span className="font-medium">{city.name}</span></> : null}.
        Welcome, fellow nomad.
      </p>
      <PostDropCta city={city} />
      <button
        type="button"
        onClick={onDropAnother}
        className="self-center font-mono text-[10px] uppercase tracking-widest text-muted underline-offset-4 hover:text-accent hover:underline"
      >
        Drop another →
      </button>
    </div>
  );
}

function PostDropCta({ city }: { city: City | null }) {
  // Open city: send them straight into the product.
  if (city?.status === "open") {
    return (
      <Link
        href={`/${city.slug}`}
        className="self-center rounded-full bg-accent px-5 py-2 text-sm font-medium text-page hover:bg-accent-hover"
      >
        See who&apos;s working in {city.name} today →
      </Link>
    );
  }

  // Building city: city-scoped subscribe so we know exactly which one to open.
  if (city?.status === "building") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-center text-muted">
          We&apos;re not open in {city.name} yet — be first to know when we are.
        </p>
        <SubscribeForm city={city.slug} />
      </div>
    );
  }

  // Outside our 4 covered cities: keep the lead, no city attribution.
  return (
    <div className="flex flex-col gap-2">
      <p className="text-center text-muted">
        We open city by city. Drop your email — we&apos;ll ping you when we
        get to your area.
      </p>
      <SubscribeForm city="outside" />
    </div>
  );
}
