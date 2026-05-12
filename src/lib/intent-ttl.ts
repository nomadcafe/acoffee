import { cities } from "./cities";
import type { IntentKind } from "./types";

const HOUR_MS = 60 * 60 * 1000;

// Anchor "tonight" to the city's local 22:00; "today" for hike to local 23:00.
// Both fall back to a minimum rolling window so an intent set late in the
// evening still has a useful active period.
const DINNER_TARGET_HOUR = 22;
const DINNER_MIN_HOURS = 2;
const HIKE_TARGET_HOUR = 23;
const HIKE_MIN_HOURS = 4;

// Rolling TTLs for the open-ended intents — coffee/cowork can happen any
// time of day, so a flat 4-hour window is the right semantic.
const ROLLING_HOURS: Record<IntentKind, number> = {
  coffee: 4,
  cowork: 4,
  // dinner/hike values used only as fallback if city not found.
  dinner: 6,
  hike: 12,
};

export function computeIntentExpiry(
  kind: IntentKind,
  citySlug: string,
  now: Date = new Date(),
): Date {
  const city = cities[citySlug];
  if (kind === "coffee" || kind === "cowork" || !city) {
    return new Date(now.getTime() + ROLLING_HOURS[kind] * HOUR_MS);
  }

  if (kind === "dinner") {
    return nextLocalHourOrMinWindow(
      now,
      city.utcOffsetHours,
      DINNER_TARGET_HOUR,
      DINNER_MIN_HOURS,
    );
  }
  // hike
  return nextLocalHourOrMinWindow(
    now,
    city.utcOffsetHours,
    HIKE_TARGET_HOUR,
    HIKE_MIN_HOURS,
  );
}

// Compute the next absolute moment that's `targetLocalHour:00` in a tz
// offset of `offsetHours`; if that target is already past today, roll to
// tomorrow. Then floor the result by `minHours` from now so a late-evening
// set still gets a usable window.
function nextLocalHourOrMinWindow(
  now: Date,
  offsetHours: number,
  targetLocalHour: number,
  minHours: number,
): Date {
  const offsetMs = offsetHours * HOUR_MS;
  // Shift "now" into the city's wall-clock by treating (UTC + offset) as UTC.
  const localWall = new Date(now.getTime() + offsetMs);
  const localHour = localWall.getUTCHours();

  const dayOffset = localHour >= targetLocalHour ? 1 : 0;
  const targetLocalMs = Date.UTC(
    localWall.getUTCFullYear(),
    localWall.getUTCMonth(),
    localWall.getUTCDate() + dayOffset,
    targetLocalHour,
    0,
    0,
  );
  const targetAbsoluteMs = targetLocalMs - offsetMs;
  const minAbsoluteMs = now.getTime() + minHours * HOUR_MS;
  return new Date(Math.max(targetAbsoluteMs, minAbsoluteMs));
}
