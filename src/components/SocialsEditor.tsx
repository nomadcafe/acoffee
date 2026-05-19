"use client";

import { useMemo } from "react";
import { SocialIcon } from "@/components/icons/SocialIcons";
import { useT } from "@/components/LocaleProvider";
import { PLATFORMS } from "@/lib/socials";
import {
  MAX_SOCIAL_LINKS,
  SOCIAL_PLATFORMS,
  type SocialLink,
  type SocialPlatform,
} from "@/lib/types";

// bio.link-style socials editor. The user adds rows one at a time and
// picks the platform per row via a native <select>. Each row is a
// platform icon + a <select> + a value <input> + a delete button. State
// is fully controlled by the parent so the LiveCardPreview can show the
// links in real time; on submit, the array is JSON-stringified into a
// single hidden input (`socialLinks`) and parsed server-side.

export function SocialsEditor({
  links,
  onChange,
}: {
  links: SocialLink[];
  onChange: (next: SocialLink[]) => void;
}) {
  const t = useT();

  // Default new-row platform = website. Most useful first pick + has the
  // simplest validation (any URL) so the user can confirm the add flow
  // before learning per-platform rules.
  function addRow() {
    if (links.length >= MAX_SOCIAL_LINKS) return;
    onChange([...links, { platform: "website", value: "" }]);
  }

  function updateRow(index: number, patch: Partial<SocialLink>) {
    onChange(
      links.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    );
  }

  function removeRow(index: number) {
    onChange(links.filter((_, i) => i !== index));
  }

  // Serialise to JSON for the form. Strip empty-value rows on the way
  // out so the server isn't asked to validate placeholders. The
  // memoised stringify keeps the hidden input stable when nothing
  // actually changed (avoids re-rendering downstream forms).
  const serialised = useMemo(
    () => JSON.stringify(links.filter((l) => l.value.trim().length > 0)),
    [links],
  );

  return (
    <fieldset className="flex flex-col gap-3 border-none p-0">
      <legend className="text-xs font-medium uppercase tracking-wide text-accent">
        {t("profile.socials.legend")}
      </legend>
      <p className="-mt-1 text-sm text-muted">{t("profile.socials.hint")}</p>

      {links.length === 0 && (
        <p className="text-sm italic text-muted">
          {t("profile.socials.empty")}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {links.map((link, i) => {
          const meta = PLATFORMS[link.platform];
          return (
            // Row layout: on mobile (< sm) the input wraps to its own
            // line because it's w-full, so the first row is just the
            // icon + select + ✕ button. On sm+ everything sits on one
            // row (icon · select · input · button) via the sm: order /
            // width overrides. flex-wrap is what enables the mobile
            // wrap without breaking the desktop single-row layout.
            <li
              key={i}
              className="flex flex-wrap items-stretch gap-2 rounded-2xl border border-bean bg-surface p-2"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                <SocialIcon platform={link.platform} />
              </div>
              <select
                value={link.platform}
                aria-label={t("profile.socials.platformLabel")}
                onChange={(e) =>
                  updateRow(i, {
                    platform: e.target.value as SocialPlatform,
                  })
                }
                className="h-10 flex-1 rounded-xl border border-bean bg-surface px-2 text-base text-ink/85 sm:text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 sm:w-36 sm:flex-none"
              >
                {SOCIAL_PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {PLATFORMS[p].label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeRow(i)}
                aria-label={t("profile.socials.remove")}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted hover:bg-bean/40 hover:text-accent sm:order-last"
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
              {/* Value input. On mobile this wraps to its own row
                  because of w-full + flex-wrap; on desktop the button
                  above takes order-last so the input visually sits
                  between the select and the button. */}
              <input
                type="text"
                value={link.value}
                onChange={(e) => updateRow(i, { value: e.target.value })}
                placeholder={meta.placeholder}
                className="h-10 w-full min-w-0 rounded-xl border border-bean bg-surface px-3 text-base text-ink outline-none sm:text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 sm:w-auto sm:flex-1"
              />
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={addRow}
          disabled={links.length >= MAX_SOCIAL_LINKS}
          className="inline-flex items-center gap-2 self-start rounded-full border border-dashed border-bean bg-surface px-4 py-2 text-sm font-medium text-ink/85 hover:border-accent/60 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span aria-hidden>+</span>
          {t("profile.socials.add")}
        </button>
        {links.length >= MAX_SOCIAL_LINKS && (
          <span className="text-xs text-muted">
            {t("profile.socials.max")}
          </span>
        )}
      </div>

      <input type="hidden" name="socialLinks" value={serialised} />
    </fieldset>
  );
}
