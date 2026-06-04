"use client";

import { useMemo, useState } from "react";
import { useT } from "@/components/LocaleProvider";
import {
  MAX_INTERESTS,
  SUGGESTED_INTERESTS,
  normaliseInterest,
} from "@/lib/interests";

// Interest-tag editor, modelled on SocialsEditor. The user types a tag
// and adds it on Enter / comma (or taps a suggestion chip); each added
// tag normalises to a `#slug` chip with a remove button. State is fully
// controlled by the parent so the LiveCardPreview mirrors it in real
// time; on submit the array is JSON-stringified into a hidden input
// (`interests`) and validated server-side.

export function InterestsEditor({
  interests,
  onChange,
}: {
  interests: string[];
  onChange: (next: string[]) => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState("");
  const atMax = interests.length >= MAX_INTERESTS;

  // Add a normalised tag if it's usable, new, and we're under the cap.
  // Returns whether anything was added so the keydown handler can decide
  // to clear the draft.
  function addTag(raw: string): boolean {
    const tag = normaliseInterest(raw);
    if (!tag) return false;
    if (interests.includes(tag)) return true; // treat dupe as "handled"
    if (interests.length >= MAX_INTERESTS) return false;
    onChange([...interests, tag]);
    return true;
  }

  function commitDraft() {
    if (addTag(draft)) setDraft("");
  }

  function removeTag(tag: string) {
    onChange(interests.filter((x) => x !== tag));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Enter / comma commit the current draft; Backspace on an empty
    // draft pops the last chip (matches common tag-input muscle memory).
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commitDraft();
    } else if (e.key === "Backspace" && draft === "" && interests.length > 0) {
      removeTag(interests[interests.length - 1]);
    }
  }

  // Suggestions not already chosen, hidden once at the cap.
  const suggestions = useMemo(
    () => SUGGESTED_INTERESTS.filter((s) => !interests.includes(s)),
    [interests],
  );

  const serialised = useMemo(() => JSON.stringify(interests), [interests]);

  return (
    <fieldset className="flex flex-col gap-3 border-none p-0">
      <legend className="text-xs font-medium uppercase tracking-wide text-accent">
        {t("profile.interests.legend")}
      </legend>
      <p className="-mt-1 text-sm text-muted">{t("profile.interests.hint")}</p>

      {interests.length === 0 && (
        <p className="text-sm italic text-muted">
          {t("profile.interests.empty")}
        </p>
      )}

      {interests.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {interests.map((tag) => (
            <li key={tag}>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent-soft py-1 pl-3 pr-1.5 text-sm font-medium text-accent">
                #{tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={`${t("profile.interests.remove")} #${tag}`}
                  className="grid h-5 w-5 place-items-center rounded-full text-accent/70 hover:bg-accent/15 hover:text-accent"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
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

      {!atMax && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={commitDraft}
            placeholder={t("profile.interests.placeholder")}
            className="h-10 min-w-0 flex-1 rounded-xl border border-bean bg-surface px-3 text-base text-ink outline-none sm:text-sm focus:border-accent focus:ring-2 focus:ring-accent/20"
            aria-label={t("profile.interests.legend")}
          />
          <button
            type="button"
            onClick={commitDraft}
            disabled={normaliseInterest(draft) === null}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-dashed border-bean bg-surface px-4 py-2 text-sm font-medium text-ink/85 hover:border-accent/60 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span aria-hidden>+</span>
            {t("profile.interests.add")}
          </button>
        </div>
      )}

      {atMax && (
        <span className="text-xs text-muted">{t("profile.interests.max")}</span>
      )}

      {!atMax && suggestions.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">
            {t("profile.interests.suggested")}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addTag(s)}
                className="inline-flex items-center rounded-full border border-bean bg-surface px-2.5 py-0.5 text-xs font-medium text-ink/60 hover:border-accent/60 hover:bg-accent-soft hover:text-accent"
              >
                #{s}
              </button>
            ))}
          </div>
        </div>
      )}

      <input type="hidden" name="interests" value={serialised} />
    </fieldset>
  );
}
