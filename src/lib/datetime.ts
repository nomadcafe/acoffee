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
