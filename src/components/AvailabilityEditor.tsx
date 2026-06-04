"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addSlot, removeSlot } from "@/app/profile/actions";
import { useLocale, useT } from "@/components/LocaleProvider";
import { formatSlot } from "@/lib/datetime";
import type { AvailabilitySlot } from "@/lib/types";

// Opt-in coffee scheduling editor (v16). Rendered inside ProfileForm's
// <form>, but the slot list is managed by its own server actions
// (addSlot / removeSlot) + router.refresh(), same pattern as the invite
// inbox — only the on/off toggle rides the profile form submit (via the
// hidden `schedulingEnabled` input here).
//
// Times are entered with a native <input type="datetime-local"> (the
// browser's own tz) and converted to an absolute instant before sending;
// the browser's IANA tz travels along so slots render consistently later.
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

  // Browser timezone — captured at add time so the host's slots display in
  // the zone they actually set them in.
  const browserTz =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";
  // Prefer the stored host tz for display once set; until then the browser's.
  const displayTz = timezone ?? browserTz;

  function add() {
    if (!draft) return;
    // datetime-local has no tz; new Date(local) interprets in the browser
    // zone, and toISOString() yields the matching UTC instant.
    const instant = new Date(draft);
    if (Number.isNaN(instant.getTime())) {
      setError(t("profile.scheduling.invalid"));
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await addSlot(instant.toISOString(), browserTz);
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

  // Min for the picker = now (local), so past times can't be entered. Format
  // as YYYY-MM-DDTHH:mm in local time.
  const minLocal = localInputValue(new Date());

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
            {tmplTz(t("profile.scheduling.tzNote"), displayTz)}
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
                    {formatSlot(s.startsAt, timezone, locale)}
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

// Format a Date as the value a <input type="datetime-local"> expects
// (local YYYY-MM-DDTHH:mm), used as the picker's `min` so past times are
// unselectable. Local components — matches what the user sees in the field.
function localInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Tiny {tz} interpolation for the timezone note — avoids importing tmpl
// just for one substitution.
function tmplTz(template: string, tz: string): string {
  return template.replace("{tz}", tz);
}
