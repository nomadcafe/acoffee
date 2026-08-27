// Sliding-window rate limiting, in two layers.
//
//   • checkRateLimit — in-memory, synchronous, free. One Map per process.
//   • checkRateLimitDurable — the same windows, backed by Postgres, so the
//     count survives across serverless instances.
//
// The in-memory layer was the whole story through v0.18, and on Vercel it
// barely limits anything: each instance carries its own Map, so the real
// ceiling is the configured limit times the number of live instances — and
// a burst is exactly what makes Vercel start more of them. It's kept as
// the first line because it's free and it does stop the same-instance
// hammering that a naive script produces; the durable layer is what a
// distributed or determined caller actually runs into.
//
// Which endpoints get which: anything unauthenticated that sends mail
// (createInvite, sendMagicLink) uses the durable check. Signed-in actions
// stay in-memory — they're keyed on a user id, abuse costs an account, and
// they're called often enough (a debounced handle check runs per keystroke
// burst) that a DB round-trip per call would be the more expensive mistake.

type Window = { windowMs: number; max: number };

type Entry = { hits: number[] };

const g = globalThis as unknown as { __nm_rl?: Map<string, Entry> };
const store: Map<string, Entry> = (g.__nm_rl ??= new Map());

// Entries are pruned when their key is touched again, which does nothing
// for the keys that never come back — and "one IP, seen once" is most of
// them. Left alone the Map is a slow leak on any long-lived process (next
// start, a container, local dev), so sweep it on a timer: at most once a
// minute, dropping anything with no hit inside the retention window. The
// longest window any caller passes is 24h (the daily sign-in cap).
const MEM_RETENTION_MS = 24 * 60 * 60 * 1000;
const MEM_SWEEP_EVERY_MS = 60 * 1000;
let lastSweep = 0;

function sweepMemory(now: number): void {
  if (now - lastSweep < MEM_SWEEP_EVERY_MS) return;
  lastSweep = now;
  for (const [key, entry] of store) {
    const newest = entry.hits[entry.hits.length - 1];
    if (newest === undefined || now - newest > MEM_RETENTION_MS) {
      store.delete(key);
    }
  }
}

// Number of keys currently held in the process-local Map. Exists for the
// eviction test and for a debugger session — the sweep it verifies is
// invisible from the outside otherwise, since an entry whose hits have all
// aged out behaves identically to one that was deleted. Never branch on it
// in app code.
export function memoryEntryCount(): number {
  return store.size;
}

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
  sweepMemory(now);
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

// Said once per process, not once per request — a missing function is a
// standing config fact, and repeating it would bury the logs it's competing
// with (the rate-limit and captcha warnings we actually want to see).
let warnedNoRpc = false;

/**
 * The same check, counted in Postgres so it holds across instances.
 *
 * The in-memory check runs first: it's free, and a caller already over the
 * local limit doesn't need a round-trip to be told so. Only a locally-
 * allowed request pays for the RPC.
 *
 * Fails open — if the function isn't deployed yet, or the service-role key
 * is missing, or the query errors, the in-memory verdict stands and we log
 * once. That's deliberate: this is the second of two layers plus a CAPTCHA,
 * and taking the invite form offline because a migration hasn't been run
 * would be a worse outcome than a window that's briefly per-instance again.
 */
export async function checkRateLimitDurable(
  key: string,
  windows: Window[],
): Promise<RateLimitResult> {
  const local = checkRateLimit(key, windows);
  if (!local.allowed) return local;

  try {
    // Imported here rather than at module scope on purpose: the Supabase
    // server module reaches for next/headers, and everything above this
    // point is pure. Keeping it inside the async branch means the
    // in-memory limiter stays importable from a plain Node context (the
    // unit tests) and callers that never take this path never load it.
    const { createSupabaseAdmin } = await import("@/lib/supabase/server");
    const admin = createSupabaseAdmin();
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_key: key,
      p_windows: windows.map((w) => ({
        seconds: Math.max(1, Math.round(w.windowMs / 1000)),
        max: w.max,
      })),
    });
    if (error) throw new Error(error.message);
    const row = data as { allowed?: boolean; retry_after_sec?: number } | null;
    if (!row || typeof row.allowed !== "boolean") {
      throw new Error("unexpected check_rate_limit payload");
    }
    return {
      allowed: row.allowed,
      retryAfterSec: Math.max(0, Math.round(row.retry_after_sec ?? 0)),
    };
  } catch (e) {
    if (!warnedNoRpc) {
      warnedNoRpc = true;
      console.warn(
        "[rate-limit] durable check unavailable — falling back to the " +
          "in-memory window, which does not hold across serverless " +
          "instances. Run supabase/schema_v19.sql.",
        e instanceof Error ? e.message : e,
      );
    }
    return local;
  }
}

export function ipFromHeaders(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
