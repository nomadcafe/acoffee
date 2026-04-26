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
import type { Pin } from "@/lib/types";
import { timeAgo } from "@/lib/time-ago";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
const DROPPED_KEY = "nm_dropped_pin_id";
const DAY_MS = 24 * 60 * 60 * 1000;

type LeafProps = { pinId: string; nickname: string | null; createdAt: string };

type PinMapProps = {
  initialPins: Pin[];
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  countSuffix?: string;
  emptyLabel?: string;
  height?: string;
};

export function PinMap({
  initialPins,
  initialCenter = { lat: 20, lng: 10 },
  initialZoom = 1.4,
  countSuffix = "on the map",
  emptyLabel,
  height = "h-[60vh] sm:h-[70vh]",
}: PinMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [pins, setPins] = useState<Pin[]>(initialPins);
  const [last24h, setLast24h] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [nickname, setNickname] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<Pin | null>(null);
  const [viewState, setViewState] = useState({
    longitude: initialCenter.lng,
    latitude: initialCenter.lat,
    zoom: initialZoom,
  });
  const [bounds, setBounds] = useState<[number, number, number, number]>([
    -180, -85, 180, 85,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DROPPED_KEY)) setDone(true);
  }, []);

  const visiblePins = useMemo(() => {
    if (!last24h) return pins;
    const cutoff = Date.now() - DAY_MS;
    return pins.filter((p) => new Date(p.createdAt).getTime() >= cutoff);
  }, [pins, last24h]);

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
        setError(err.message || "Could not get your location.");
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
      setDone(true);
      localStorage.setItem(DROPPED_KEY, json.pin.id);
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
  const label = last24h && count > 0 ? `${baseLabel} · last 24h` : baseLabel;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 ${height}`}
    >
      <Map
        ref={mapRef}
        {...viewState}
        onMove={onMove}
        onLoad={onLoad}
        mapStyle={MAP_STYLE}
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
                  className="flex items-center justify-center rounded-full bg-emerald-500/90 font-semibold text-white shadow-md ring-2 ring-white transition hover:bg-emerald-500"
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
                className="block h-3 w-3 rounded-full bg-emerald-500 shadow ring-2 ring-white transition hover:scale-125"
                aria-label={pin.nickname ?? "Anonymous nomad"}
              />
            </Marker>
          );
        })}

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
              <div className="font-medium text-zinc-900">
                {hovered.nickname ?? "Anonymous nomad"}
              </div>
              <div className="text-zinc-500">{timeAgo(hovered.createdAt)}</div>
            </div>
          </Popup>
        )}
      </Map>

      <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium text-zinc-700 backdrop-blur dark:bg-black/70 dark:text-zinc-200">
        {label}
      </div>

      <button
        onClick={() => setLast24h((v) => !v)}
        className={`absolute right-4 top-4 z-10 rounded-full px-3 py-1.5 text-sm font-medium shadow-sm backdrop-blur transition ${
          last24h
            ? "bg-emerald-500 text-white hover:bg-emerald-600"
            : "bg-white/90 text-zinc-700 hover:bg-white dark:bg-black/70 dark:text-zinc-200"
        }`}
        aria-pressed={last24h}
      >
        Last 24h
      </button>

      <div className="absolute bottom-4 left-1/2 z-10 w-[min(92vw,520px)] -translate-x-1/2 rounded-2xl border border-zinc-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        {done ? (
          <p className="px-2 py-1 text-center text-sm text-zinc-700 dark:text-zinc-300">
            You&apos;re on the map. Welcome, fellow nomad.
          </p>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Nickname (optional)"
              maxLength={40}
              className="flex-1 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
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
              className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
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
    </div>
  );
}
