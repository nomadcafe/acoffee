"use client";

import { useEffect, useState } from "react";

function formatSince(createdMs: number, nowMs: number): string {
  const m = Math.max(0, Math.floor((nowMs - createdMs) / 60000));
  if (m === 0) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

// Live "X min" / "1h 5m" elapsed counter — same SSR-then-tick pattern as
// LiveCountdown, but counting up from `createdAt` instead of down to
// `expiresAt`. Used by the café roster to show how long each person has
// been working at the café.
export function LiveTimeSince({
  createdAt,
  className,
  prefix,
  suffix,
}: {
  createdAt: string;
  className?: string;
  prefix?: string;
  suffix?: string;
}) {
  const createdMs = new Date(createdAt).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className={className} suppressHydrationWarning>
      {prefix}
      {formatSince(createdMs, now)}
      {suffix}
    </span>
  );
}
