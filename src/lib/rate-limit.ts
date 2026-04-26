// In-memory sliding-window rate limiter, keyed by an opaque identifier
// (typically IP). Adequate for Phase 0 traffic on a single Node process.
// Multi-instance (Vercel serverless under burst) will leak some requests
// across instances; revisit with Upstash/Redis when traffic justifies it.

type Window = { windowMs: number; max: number };

type Entry = { hits: number[] };

const g = globalThis as unknown as { __nm_rl?: Map<string, Entry> };
const store: Map<string, Entry> = (g.__nm_rl ??= new Map());

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSec: number;
};

/**
 * Apply a set of windows to one identifier; the most restrictive
 * window decides. Records the hit on success.
 */
export function checkRateLimit(
  key: string,
  windows: Window[],
): RateLimitResult {
  const now = Date.now();
  const longest = Math.max(...windows.map((w) => w.windowMs));
  const entry = store.get(key) ?? { hits: [] };
  // Drop hits older than the longest window we care about.
  entry.hits = entry.hits.filter((t) => now - t <= longest);

  for (const w of windows) {
    const inWindow = entry.hits.filter((t) => now - t <= w.windowMs).length;
    if (inWindow >= w.max) {
      const oldest = entry.hits.find((t) => now - t <= w.windowMs) ?? now;
      const retryAfterMs = w.windowMs - (now - oldest);
      store.set(key, entry);
      return {
        allowed: false,
        retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      };
    }
  }

  entry.hits.push(now);
  store.set(key, entry);
  return { allowed: true, retryAfterSec: 0 };
}

export function ipFromHeaders(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
