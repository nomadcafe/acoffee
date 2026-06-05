import { type Locale } from "./i18n/dict";

// zh needs the region subtag for Intl to pick the right names; en/ja work
// as-is. Mirrors the helper in city.ts / PresenceBanner.
function localeToBcp47(locale: Locale): string {
  return locale === "zh" ? "zh-CN" : locale;
}

// Format an absolute instant (ISO string) in a specific IANA timezone,
// labelled with that zone so a reader in another city isn't misled —
// e.g. "Jun 12, 3:00 PM · Asia/Bangkok". Scheduling slots are stored as
// instants and always shown in the host's tz (see lib/types AvailabilitySlot).
//
// `timezone` null/invalid falls back to the runtime's zone (and no label) so
// a missing tz never throws — Intl would otherwise reject a bad timeZone.
export function formatSlot(
  startsAtIso: string,
  timezone: string | null,
  locale: Locale,
): string {
  const date = new Date(startsAtIso);
  if (Number.isNaN(date.getTime())) return "";

  const bcp47 = localeToBcp47(locale);
  const tz = timezone ?? undefined;
  try {
    const formatted = date.toLocaleString(bcp47, {
      timeZone: tz,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return timezone ? `${formatted} · ${timezone}` : formatted;
  } catch {
    // Invalid timeZone → format in the runtime zone, unlabelled.
    return date.toLocaleString(bcp47, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
}

// Absolute short date ("Jun 5, 2026") in the app's locale. Same locale
// handling as formatSlot (zh → zh-CN), so surfaces like the inbox history
// render dates in the language the user picked in-app rather than whatever
// their browser happens to be set to. Empty string on an invalid date.
export function formatShortDate(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(localeToBcp47(locale), {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Offset in ms between `timeZone` and UTC at a given instant — positive
// east of UTC, DST-correct for that instant. Reads the zone's wall-clock
// via formatToParts and diffs it against the instant's UTC epoch. Throws
// (RangeError) for an invalid zone; callers that can't guarantee a good
// zone should guard with isValidTimeZone first.
function zoneOffsetMs(timeZone: string, instant: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(instant);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return asUtc - instant.getTime();
}

// Interpret a naive wall-clock string ("YYYY-MM-DDTHH:mm", exactly what a
// native <input type="datetime-local"> yields) as a local time *in*
// `timeZone`, and return the matching absolute instant. This is the piece
// that lets a host schedule in a zone other than their browser's: the
// picker gives wall-clock components with no zone, and we anchor them to
// the zone the host actually chose, so "3:00 PM · Asia/Bangkok" stays 3 PM
// Bangkok even when entered from a laptop in Lisbon.
//
// Two passes settle DST transitions: the first offset guess can land on
// the wrong side of a clock change, so we re-evaluate the offset at the
// guessed instant. Returns null for an unparseable string or bad zone.
export function zonedWallToInstant(
  wall: string,
  timeZone: string,
): Date | null {
  // Parse the components as if UTC to get a baseline epoch, then correct
  // by the zone's offset. `${wall}:00.000Z` matches the minute-precision
  // value a datetime-local emits; the looser fallback covers a value that
  // already carries seconds.
  let naive = Date.parse(`${wall}:00.000Z`);
  if (Number.isNaN(naive)) naive = Date.parse(`${wall}Z`);
  if (Number.isNaN(naive)) return null;
  try {
    let ts = naive - zoneOffsetMs(timeZone, new Date(naive));
    ts = naive - zoneOffsetMs(timeZone, new Date(ts));
    return new Date(ts);
  } catch {
    return null;
  }
}

// Current wall-clock time in `timeZone`, formatted as the value a native
// <input type="datetime-local"> expects ("YYYY-MM-DDTHH:mm"). Used as the
// picker's `min` so past times are unselectable relative to the zone the
// host is scheduling in (not their browser's). Falls back to the runtime
// zone's components if the timezone is invalid.
export function nowWallInZone(timeZone: string): string {
  const now = new Date();
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(now);
    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
  } catch {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }
}

// Validate an IANA timezone name. The host's chosen zone arrives from a
// client <select>, but the server action must not trust it — a hand-rolled
// POST could carry junk that would later make formatSlot fall back to the
// runtime zone for everyone. `Intl.DateTimeFormat` throws RangeError on an
// unknown zone, which is the standard validity probe.
export function isValidTimeZone(tz: string): boolean {
  if (typeof tz !== "string" || tz.length === 0 || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
