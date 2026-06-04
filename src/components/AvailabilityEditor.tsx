"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { addSlot, removeSlot } from "@/app/profile/actions";
import { useLocale, useT } from "@/components/LocaleProvider";
import { formatSlot, nowWallInZone, zonedWallToInstant } from "@/lib/datetime";
import type { AvailabilitySlot } from "@/lib/types";

// Opt-in coffee scheduling editor (v16). Rendered inside ProfileForm's
// <form>, so the on/off toggle (hidden `schedulingEnabled`) and the
// timezone <select> (`timezone`) both ride the profile form submit; the
// slot list itself is managed by its own server actions (addSlot /
// removeSlot) + router.refresh(), same pattern as the invite inbox.
//
// Times are entered with a native <input type="datetime-local"> (bare
// wall-clock, no zone) and anchored to the host's *chosen* timezone — not
// the browser's — before being stored as an absolute instant. That's what
// lets a nomad who set up slots in Bangkok and later edits from Lisbon
// keep one consistent display zone instead of silently re-labelling every
// time they cross a border.

// Browsers since ~2022 expose the full IANA list via Intl.supportedValuesOf;
// fall back to just the zones we already know about if it's missing.
function supportedTimeZones(): string[] {
  const intl = Intl as { supportedValuesOf?: (key: string) => string[] };
  if (typeof intl.supportedValuesOf === "function") {
    try {
      return intl.supportedValuesOf("timeZone");
    } catch {
      // fall through to the empty list
    }
  }
  return [];
}

export function AvailabilityEditor({
  enabled,
  onEnabledChange,
  slots,
  timezone,
}: {
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  slots: AvailabilitySlot[];
  timezone: string | null;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // The browser's detected zone — the default for a host who hasn't picked
  // one yet, and the target of the "use detected" nudge after a relocation.
  const browserTz =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";

  // The chosen display zone. Controlled locally so the slot list + picker
  // preview update live as the host changes it; persisted on form save via
  // the hidden-in-plain-sight <select name="timezone">. Defaults to the
  // stored value, else the browser's.
  const [tz, setTz] = useState(timezone ?? browserTz);

  // Option list for the <select>, with the current + detected zones folded
  // in so neither can ever be missing (e.g. a stored zone the browser's
  // build doesn't enumerate).
  const zoneOptions = useMemo(() => {
    const set = new Set<string>(supportedTimeZones());
    set.add(browserTz);
    if (timezone) set.add(timezone);
    set.add(tz);
    return Array.from(set).sort();
  }, [browserTz, timezone, tz]);

  function add() {
    if (!draft) return;
    // Anchor the bare wall-clock to the chosen zone, not the browser's, so
    // what the host typed matches what the card will show.
    const instant = zonedWallToInstant(draft, tz);
    if (!instant) {
      setError(t("profile.scheduling.invalid"));
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await addSlot(instant.toISOString(), tz);
      if (res.status === "ok") {
        setDraft("");
        router.refresh();
      } else {
        setError(res.message);
      }
    });
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await removeSlot(id);
      if (res.status === "ok") router.refresh();
      else setError(res.message);
    });
  }

  // Min for the picker = now in the chosen zone, so past times can't be
  // entered relative to where the host is actually scheduling.
  const minLocal = nowWallInZone(tz);

  return (
    <fieldset className="flex flex-col gap-3 border-none p-0">
      <legend className="text-xs font-medium uppercase tracking-wide text-accent">
        {t("profile.scheduling.legend")}
      </legend>
      <p className="-mt-1 text-sm text-muted">
        {t("profile.scheduling.hint")}
      </p>

      <label className="flex items-center gap-2.5 text-sm text-ink/85">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="h-4 w-4 rounded border-bean text-accent focus:ring-accent/30"
        />
        {t("profile.scheduling.toggle")}
      </label>
      {/* Always submit the flag so unchecking persists. */}
      <input
        type="hidden"
        name="schedulingEnabled"
        value={enabled ? "true" : "false"}
      />

      {enabled && (
        <div className="flex flex-col gap-3 rounded-2xl border border-bean bg-surface/60 p-3">
          {/* Timezone picker — rides the form submit. */}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink/85">
              {t("profile.scheduling.tzLabel")}
            </span>
            <select
              name="timezone"
              value={tz}
              onChange={(e) => setTz(e.target.value)}
              className="h-10 rounded-xl border border-bean bg-surface px-3 text-base text-ink outline-none sm:text-sm focus:border-accent focus:ring-2 focus:ring-accent/20"
            >
              {zoneOptions.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
            {/* Nudge a relocated host: their browser says a different zone
                than the one selected. One tap to adopt it. */}
            {tz !== browserTz && (
              <button
                type="button"
                onClick={() => setTz(browserTz)}
                className="self-start text-xs font-medium text-accent underline-offset-2 hover:underline"
              >
                {tmplTz(t("profile.scheduling.tzDetected"), browserTz)}
              </button>
            )}
          </label>

          <div className="flex flex-wrap items-end gap-2">
            <input
              type="datetime-local"
              value={draft}
              min={minLocal}
              onChange={(e) => setDraft(e.target.value)}
              className="h-10 min-w-0 flex-1 rounded-xl border border-bean bg-surface px-3 text-base text-ink outline-none sm:text-sm focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <button
              type="button"
              onClick={add}
              disabled={pending || !draft}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-page shadow-sm hover:bg-accent-hover disabled:opacity-50"
            >
              <span aria-hidden>+</span>
              {t("profile.scheduling.add")}
            </button>
          </div>

          <p className="text-xs text-muted">
            {tmplTz(t("profile.scheduling.tzNote"), tz)}
          </p>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          {slots.length === 0 ? (
            <p className="text-sm italic text-muted">
              {t("profile.scheduling.empty")}
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {slots.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-bean bg-surface px-3 py-2"
                >
                  <span className="text-sm text-ink/85">
                    {formatSlot(s.startsAt, tz, locale)}
                  </span>
                  <span className="flex items-center gap-2">
                    {s.taken && (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                        {t("profile.scheduling.booked")}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(s.id)}
                      disabled={pending}
                      aria-label={t("profile.scheduling.remove")}
                      className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-bean/40 hover:text-accent disabled:opacity-50"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        aria-hidden
                      >
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </fieldset>
  );
}

// Tiny {tz} interpolation for the timezone strings — avoids importing tmpl
// just for one substitution.
function tmplTz(template: string, tz: string): string {
  return template.replace("{tz}", tz);
}
