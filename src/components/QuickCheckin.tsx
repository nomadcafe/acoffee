"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  findNearbyCafes,
  quickCheckin,
  type NearbyResult,
} from "@/app/chiang-mai/actions";

type Step = "idle" | "locating" | "picking" | "naming" | "submitting" | "error";

type Coords = { lat: number; lng: number };

export function QuickCheckin({
  city,
  cityName,
}: {
  city: string;
  cityName: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [nearby, setNearby] = useState<NearbyResult | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function startGeolocation() {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError("Your browser doesn't support geolocation.");
      setStep("error");
      return;
    }
    setStep("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(c);
        const result = await findNearbyCafes({
          lat: c.lat,
          lng: c.lng,
          city,
        });
        setNearby(result);
        if (result.snapTarget) {
          await submitExisting(result.snapTarget.id);
        } else {
          setStep("picking");
        }
      },
      (err) => {
        setError(err.message || "Could not get your location.");
        setStep("error");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submitExisting(cafeId: string) {
    setStep("submitting");
    setError(null);
    const res = await quickCheckin({ kind: "existing", cafeId });
    if (res.ok) {
      router.push(`/chiang-mai/cafes/${res.slug}`);
      router.refresh();
    } else {
      setError(res.message);
      setStep("error");
    }
  }

  async function submitNew() {
    if (!coords) return;
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError("Give the place a name (at least 2 characters).");
      return;
    }
    setStep("submitting");
    setError(null);
    const res = await quickCheckin({
      kind: "new",
      name: trimmed,
      lat: coords.lat,
      lng: coords.lng,
      city,
    });
    if (res.ok) {
      router.push(`/chiang-mai/cafes/${res.slug}`);
      router.refresh();
    } else {
      setError(res.message);
      setStep("error");
    }
  }

  function reset() {
    setStep("idle");
    setCoords(null);
    setNearby(null);
    setName("");
    setError(null);
  }

  if (step === "idle") {
    return (
      <div className="flex flex-col gap-2">
        <button
          onClick={startGeolocation}
          className="self-start rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-page hover:bg-accent-hover"
        >
          📍 I&apos;m working here
        </button>
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
          Uses your location · adds the spot if it&apos;s new
        </p>
      </div>
    );
  }

  if (step === "locating") {
    return (
      <p className="font-mono text-sm text-muted">Locating you in {cityName}…</p>
    );
  }

  if (step === "submitting") {
    return <p className="font-mono text-sm text-muted">Checking you in…</p>;
  }

  if (step === "error") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-red-600 dark:text-red-400">
          {error ?? "Something went wrong."}
        </p>
        <button
          onClick={reset}
          className="self-start rounded-full border border-bean px-4 py-2 text-sm font-medium text-ink/85 hover:bg-bean/40"
        >
          Try again
        </button>
      </div>
    );
  }

  if (step === "picking") {
    const candidates = nearby?.cafes ?? [];
    return (
      <div className="flex flex-col gap-3">
        <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
          Pick where you are
        </p>
        {candidates.length > 0 ? (
          <ul className="flex flex-col">
            {candidates.map((c) => (
              <li
                key={c.id}
                className="border-b border-dashed border-bean last:border-b-0"
              >
                <button
                  onClick={() => submitExisting(c.id)}
                  className="flex w-full items-baseline justify-between gap-3 py-3 text-left transition hover:text-accent"
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="flex items-baseline gap-2">
                      <span className="font-serif text-lg font-medium">
                        {c.name}
                      </span>
                      {c.submissionStatus === "pending" && (
                        <NewlyAddedBadge />
                      )}
                    </span>
                    {c.neighborhood && (
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                        {c.neighborhood}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted">
                    {formatDistance(c.distanceKm)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            No known café within 500m. Add it below.
          </p>
        )}

        <div className="flex flex-col gap-2 border-t border-dashed border-bean pt-3">
          <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
            Somewhere else?
          </p>
          <button
            onClick={() => setStep("naming")}
            className="self-start rounded-full border border-accent/60 px-4 py-2 text-sm font-medium text-accent hover:bg-accent-soft"
          >
            Add a new spot →
          </button>
        </div>

        <button
          onClick={reset}
          className="self-start font-mono text-[11px] uppercase tracking-widest text-muted underline-offset-4 hover:underline"
        >
          ← Cancel
        </button>
      </div>
    );
  }

  // step === "naming"
  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
        Name this spot
      </p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Akha Ama Coffee · Roastery"
        maxLength={80}
        autoFocus
        className="rounded-full border border-bean bg-surface px-4 py-2 text-sm outline-none focus:border-accent dark:bg-bean/40"
      />
      <p className="text-xs text-muted">
        Other nomads will see this on the map. You can pick a more specific
        neighborhood label later.
      </p>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={submitNew}
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-page hover:bg-accent-hover"
        >
          Add &amp; check in →
        </button>
        <button
          onClick={() => setStep("picking")}
          className="rounded-full border border-bean px-4 py-2 text-sm font-medium text-ink/85 hover:bg-bean/40"
        >
          Back
        </button>
      </div>
    </div>
  );
}

function NewlyAddedBadge() {
  return (
    <span className="rounded-full bg-accent-soft px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-accent">
      Newly added
    </span>
  );
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

export function QuickCheckinPanel({
  city,
  cityName,
  signedIn,
  activeCheckinCafeName,
}: {
  city: string;
  cityName: string;
  signedIn: boolean;
  activeCheckinCafeName?: string | null;
}) {
  const alreadyCheckedIn =
    signedIn && typeof activeCheckinCafeName === "string";

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-3 border-t border-dashed border-bean px-4 pt-10 sm:px-6 sm:pt-12">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="font-serif text-2xl font-medium sm:text-3xl">
          {alreadyCheckedIn
            ? `You're working at ${activeCheckinCafeName}.`
            : "Where are you working today?"}
        </h2>
      </div>
      {alreadyCheckedIn ? (
        <MovingSpotCTA city={city} cityName={cityName} />
      ) : signedIn ? (
        <QuickCheckin city={city} cityName={cityName} />
      ) : (
        <SignInToCheckinCTA cityName={cityName} />
      )}
    </section>
  );
}

function MovingSpotCTA({
  city,
  cityName,
}: {
  city: string;
  cityName: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-base text-muted">
        Moved to a different café? Re-check in below — your old session ends
        automatically when the new one starts.
      </p>
      <QuickCheckin city={city} cityName={cityName} />
    </div>
  );
}

function SignInToCheckinCTA({ cityName }: { cityName: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-base text-muted">
        Drop a check-in so other nomads in {cityName} know which café is alive
        today. Snap to a known spot, or add a new one in 10 seconds.
      </p>
      <a
        href="/auth/signin?next=/chiang-mai"
        className="self-start rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-page hover:bg-accent-hover"
      >
        Sign in to check in →
      </a>
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
        One tap, no password
      </p>
    </div>
  );
}
