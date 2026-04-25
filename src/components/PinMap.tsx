"use client";
import { useEffect, useState } from "react";
import Map, { Marker } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Pin } from "@/lib/types";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
const DROPPED_KEY = "nm_dropped_pin_id";

export function PinMap({ initialPins }: { initialPins: Pin[] }) {
  const [pins, setPins] = useState<Pin[]>(initialPins);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DROPPED_KEY)) setDone(true);
  }, []);

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
        }),
      });
      const json = (await res.json()) as { pin?: Pin; error?: string };
      if (!res.ok || !json.pin) throw new Error(json.error || "failed");
      setPins((prev) => [json.pin!, ...prev]);
      setDone(true);
      localStorage.setItem(DROPPED_KEY, json.pin.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to save pin");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative h-[60vh] w-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 sm:h-[70vh]">
      <Map
        initialViewState={{ longitude: 10, latitude: 20, zoom: 1.4 }}
        mapStyle={MAP_STYLE}
        style={{ width: "100%", height: "100%" }}
      >
        {pins.map((p) => (
          <Marker key={p.id} longitude={p.lng} latitude={p.lat} anchor="center">
            <span
              title={p.nickname ?? "Anonymous nomad"}
              className="block h-2.5 w-2.5 rounded-full bg-emerald-500 shadow ring-2 ring-white"
            />
          </Marker>
        ))}
      </Map>

      <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium text-zinc-700 backdrop-blur dark:bg-black/70 dark:text-zinc-200">
        {pins.length} nomad{pins.length === 1 ? "" : "s"} on the map
      </div>

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
