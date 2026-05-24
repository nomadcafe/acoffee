import { t, tmpl, type Locale } from "@/lib/i18n/dict";

// v0.11 — nomad presence pill rendered above the card on /[handle]
// when the host has set a `city_until` date that's still in the future.
// Residents and "I live here, no end date" users see nothing. Stale
// (past) dates are also suppressed so a forgotten value doesn't render
// "I was here until last month" — the read-side gating means we don't
// need a cron to clear the column.
//
// Date precision is day-level. We compare YYYY-MM-DD strings instead
// of Date objects to dodge the UTC midnight / local timezone trap a
// naive `new Date(iso)` would introduce around the day boundary.
export function PresenceBanner({
  city,
  cityUntil,
  locale,
}: {
  city: string | null;
  cityUntil: string | null;
  locale: Locale;
}) {
  if (!city || !cityUntil) return null;
  const todayIso = new Date().toISOString().slice(0, 10);
  if (cityUntil < todayIso) return null;

  // Parse YYYY-MM-DD into local-time components so toLocaleDateString
  // formats the calendar day the user typed, not the UTC-shifted day.
  const [y, m, d] = cityUntil.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  const dateLabel = date.toLocaleDateString(toBcp47(locale), {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });

  return (
    <p className="inline-flex w-fit items-center gap-2 rounded-full border border-accent/40 bg-accent-soft/60 px-3.5 py-1.5 text-sm font-medium text-accent">
      <span aria-hidden>📍</span>
      <span>
        {tmpl(t(locale, "presence.banner"), { city, date: dateLabel })}
      </span>
    </p>
  );
}

function toBcp47(locale: Locale): string {
  if (locale === "zh") return "zh-CN";
  return locale;
}
