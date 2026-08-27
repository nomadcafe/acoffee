import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkRateLimit,
  ipFromHeaders,
  memoryEntryCount,
} from "@/lib/rate-limit";

// The store is process-global by design (it has to survive between requests
// in the same instance), so every test uses its own key prefix rather than
// resetting shared state.
let n = 0;
const key = (label: string) => `test:${label}:${n++}`;

const MIN = 60_000;

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-27T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to max, then denies", () => {
    const k = key("burst");
    const w = [{ windowMs: MIN, max: 3 }];
    expect(checkRateLimit(k, w).allowed).toBe(true);
    expect(checkRateLimit(k, w).allowed).toBe(true);
    expect(checkRateLimit(k, w).allowed).toBe(true);
    expect(checkRateLimit(k, w).allowed).toBe(false);
  });

  it("keys are independent", () => {
    const w = [{ windowMs: MIN, max: 1 }];
    const a = key("indep-a");
    const b = key("indep-b");
    expect(checkRateLimit(a, w).allowed).toBe(true);
    expect(checkRateLimit(a, w).allowed).toBe(false);
    expect(checkRateLimit(b, w).allowed).toBe(true);
  });

  it("lets the window slide", () => {
    const k = key("slide");
    const w = [{ windowMs: MIN, max: 2 }];
    checkRateLimit(k, w);
    checkRateLimit(k, w);
    expect(checkRateLimit(k, w).allowed).toBe(false);
    // Past the window, the first two hits no longer count.
    vi.advanceTimersByTime(MIN + 1000);
    expect(checkRateLimit(k, w).allowed).toBe(true);
  });

  it("reports when the oldest hit falls out of the window", () => {
    const k = key("retry");
    const w = [{ windowMs: MIN, max: 1 }];
    checkRateLimit(k, w);
    vi.advanceTimersByTime(20_000);
    const denied = checkRateLimit(k, w);
    expect(denied.allowed).toBe(false);
    // 60s window, hit was 20s ago → ~40s to wait.
    expect(denied.retryAfterSec).toBe(40);
  });

  it("never reports a retry of zero on a denial", () => {
    const k = key("retry-floor");
    const w = [{ windowMs: 500, max: 1 }];
    checkRateLimit(k, w);
    vi.advanceTimersByTime(499);
    const denied = checkRateLimit(k, w);
    expect(denied.allowed).toBe(false);
    // Sub-second remainder still has to round up — a client told to retry
    // in 0s retries immediately and just gets denied again.
    expect(denied.retryAfterSec).toBe(1);
  });

  it("lets the most restrictive window decide", () => {
    const k = key("multi");
    // Generous per-minute, tight per-hour: the hourly cap is what bites.
    const w = [
      { windowMs: MIN, max: 100 },
      { windowMs: 60 * MIN, max: 2 },
    ];
    expect(checkRateLimit(k, w).allowed).toBe(true);
    expect(checkRateLimit(k, w).allowed).toBe(true);
    expect(checkRateLimit(k, w).allowed).toBe(false);
    // A minute later the burst window is clear but the hourly one isn't.
    vi.advanceTimersByTime(MIN + 1000);
    expect(checkRateLimit(k, w).allowed).toBe(false);
  });

  it("does not record a hit on a denied call", () => {
    const k = key("no-record");
    const w = [{ windowMs: MIN, max: 1 }];
    checkRateLimit(k, w); // t=0, the one allowed hit
    vi.advanceTimersByTime(30_000);
    checkRateLimit(k, w); // denied — must not extend the window
    vi.advanceTimersByTime(31_000);
    // 61s after the only recorded hit, the window is clear again. If the
    // denial at t=30s had been recorded, this would still be denied.
    expect(checkRateLimit(k, w).allowed).toBe(true);
  });

  it("evicts keys nothing has touched in a day", () => {
    const k = key("evict");
    checkRateLimit(k, [{ windowMs: MIN, max: 1 }]);
    const before = memoryEntryCount();
    expect(before).toBeGreaterThan(0);

    // A day and a half later, any call at all triggers the sweep (it runs
    // at most once a minute) and the idle key goes with it.
    vi.advanceTimersByTime(36 * 60 * MIN);
    checkRateLimit(key("evict-other"), [{ windowMs: MIN, max: 1 }]);
    // Only the key we just touched survives.
    expect(memoryEntryCount()).toBe(1);
  });
});

describe("ipFromHeaders", () => {
  it("takes the first entry of x-forwarded-for", () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.1, 70.41.3.18" });
    expect(ipFromHeaders(h)).toBe("203.0.113.1");
  });

  it("trims surrounding whitespace", () => {
    const h = new Headers({ "x-forwarded-for": "  203.0.113.1  " });
    expect(ipFromHeaders(h)).toBe("203.0.113.1");
  });

  it("falls back to x-real-ip, then to a sentinel", () => {
    expect(ipFromHeaders(new Headers({ "x-real-ip": "198.51.100.7" }))).toBe(
      "198.51.100.7",
    );
    expect(ipFromHeaders(new Headers())).toBe("unknown");
  });

  it("prefers x-real-ip over an empty forwarded-for", () => {
    const h = new Headers({
      "x-forwarded-for": "",
      "x-real-ip": "198.51.100.7",
    });
    expect(ipFromHeaders(h)).toBe("198.51.100.7");
  });
});
