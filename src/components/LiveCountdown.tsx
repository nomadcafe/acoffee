"use client";

import { useEffect, useState } from "react";

function formatTimeLeft(expiresAtMs: number, nowMs: number): string {
  const m = Math.max(0, Math.floor((expiresAtMs - nowMs) / 60000));
  if (m === 0) return "expired";
  if (m < 60) return `${m}m left`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h left` : `${h}h ${rem}m left`;
}

// Live "Xm left" countdown that re-ticks every 30s. SSR renders the value at
// request-time so the user sees something immediately; after hydration the
// client computes a fresh value and starts the interval. `suppressHydrationWarning`
// silences the inevitable few-second drift between the two renders.
export function LiveCountdown({
  expiresAt,
  className,
}: {
  expiresAt: string;
  className?: string;
}) {
  const expiresAtMs = new Date(expiresAt).getTime();
  // Lazy init runs on both server (=request time) and client first render
  // (=hydration time). Both are within seconds of each other; the
  // suppressHydrationWarning below covers any drift.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className={className} suppressHydrationWarning>
      {formatTimeLeft(expiresAtMs, now)}
    </span>
  );
}
