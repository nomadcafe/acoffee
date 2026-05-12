"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Triggers `router.refresh()` once the wall clock crosses `at`. Used to bump
// stale server data off the screen when a TTL passes while the user is still
// on the page (e.g. a check-in's 2-hour window expires).
//
// `bufferMs` defers slightly past the deadline so a server re-fetch sees the
// row as already expired (otherwise we race the DB's NOW()).
export function RefreshAt({
  at,
  bufferMs = 2_000,
}: {
  at: string;
  bufferMs?: number;
}) {
  const router = useRouter();
  useEffect(() => {
    const ms = new Date(at).getTime() - Date.now() + bufferMs;
    if (ms <= 0) {
      router.refresh();
      return;
    }
    const id = setTimeout(() => router.refresh(), ms);
    return () => clearTimeout(id);
  }, [at, bufferMs, router]);
  return null;
}
