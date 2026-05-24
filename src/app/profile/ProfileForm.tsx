"use client";
import { useActionState, useEffect, useState } from "react";
import { AvatarUpload } from "@/components/AvatarUpload";
import { LiveCardPreview } from "@/components/LiveCardPreview";
import { useT } from "@/components/LocaleProvider";
import { tmpl } from "@/lib/i18n/dict";
import { SocialsEditor } from "@/components/SocialsEditor";
import {
  COFFEE_CHAT_KINDS,
  GENDERS,
  type CoffeeChatKind,
  type Gender,
  type MyProfile,
  type SocialLink,
} from "@/lib/types";
import {
  checkHandleAvailable,
  updateProfile,
  type HandleCheckResult,
  type ProfileState,
} from "./actions";

const HANDLE_RE = /^[a-z0-9_]+$/;
const CHECK_DEBOUNCE_MS = 350;

const INITIAL: ProfileState = { status: "idle" };

// Default trigger-generated handles look like "user_a1b2c3d4". Don't show
// them as a defaultValue — the user would have to manually clear before
// typing. Let placeholder guide instead, so the field starts empty and the
// real handle gets typed in one go.
const AUTO_HANDLE = /^user_[a-f0-9]{8}$/;

// Same derivation as the public /[handle] page + SiteNav — title-case the
// underscored handle for the avatar's initials and the display name shown
// alongside the chip ("alex_nomad" → "Alex Nomad").
function deriveDisplayName(handle: string): string {
  if (!handle) return "Your name";
  return handle
    .split("_")
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
}

const KIND_EMOJI: Record<CoffeeChatKind, string> = {
  coffee: "☕",
  cowork: "💻",
  dinner: "🍜",
  hike: "🥾",
  work_talk: "💼",
};

export function ProfileForm({
  profile,
  after,
}: {
  profile: MyProfile;
  after?: string;
}) {
  const t = useT();
  const [state, action, pending] = useActionState(updateProfile, INITIAL);
  const errs = state.fieldErrors ?? {};
  const isAutoHandle = AUTO_HANDLE.test(profile.handle);

  // Controlled state for every field that the LiveCardPreview reads. The
  // form is still submitted via the server action — `name` attributes carry
  // the actual values — so React state here is purely for the preview, not
  // an alternate data path. defaultValue → useState initial means
  // hydration matches markup.
  const [handle, setHandle] = useState(
    isAutoHandle ? "" : profile.handle,
  );
  const [city, setCity] = useState(profile.city ?? "");
  const [cityUntil, setCityUntil] = useState(profile.cityUntil ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [telegram, setTelegram] = useState(profile.telegramHandle ?? "");
  const [whatsapp, setWhatsapp] = useState(profile.whatsappNumber ?? "");
  const [emailContact, setEmailContact] = useState(profile.emailContact ?? "");
  // v0.9 — optional gender soft signal. Empty string submits as null
  // ("prefer not to say"); the action coerces empty back to null.
  const [gender, setGender] = useState<Gender | "">(profile.gender ?? "");
  // v0.10 — bio.link-style dynamic socials. The SocialsEditor manages
  // its own JSON-serialisation into a hidden input; we keep the array
  // here so the LiveCardPreview can mirror it.
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(
    profile.socialLinks,
  );
  const [selectedKinds, setSelectedKinds] = useState<Set<CoffeeChatKind>>(
    () => new Set(profile.coffeeChatKinds),
  );
  // avatarUrl is committed via AvatarUpload directly (storage + DB write
  // happen on upload, not on form submit). The state mirror exists so the
  // LiveCardPreview shows the new photo immediately without waiting for
  // the router-refresh to round-trip.
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    profile.avatarUrl,
  );

  // Real-time handle availability: debounced server check so the user
  // sees "Available ✓" / "Taken" / "Reserved" before they hit Save.
  // null = idle (not enough input yet); "checking" while a request is
  // in flight; otherwise the typed server result.
  const [handleCheck, setHandleCheck] = useState<
    HandleCheckResult | "checking" | null
  >(null);
  useEffect(() => {
    const trimmed = handle.trim().toLowerCase();
    if (trimmed === "") {
      setHandleCheck(null);
      return;
    }
    // Don't burn a request on the user's own handle — the server would
    // return "yours" anyway, just say so locally.
    if (!isAutoHandle && trimmed === profile.handle.toLowerCase()) {
      setHandleCheck({ status: "yours" });
      return;
    }
    // Cheap format guard — same regex the server enforces. Stops the
    // debounced request when input is obviously wrong.
    if (trimmed.length < 3) {
      setHandleCheck({
        status: "invalid",
        reason: "Needs at least 3 characters.",
      });
      return;
    }
    if (!HANDLE_RE.test(trimmed)) {
      setHandleCheck({
        status: "invalid",
        reason: "Lowercase letters, digits, and _ only.",
      });
      return;
    }
    setHandleCheck("checking");
    const t = setTimeout(async () => {
      const result = await checkHandleAvailable(trimmed);
      setHandleCheck(result);
    }, CHECK_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [handle, profile.handle, isAutoHandle]);

  // Narrow the "checking" sentinel out so the .status access below is
  // type-safe. `result` is either null (idle, format problem) or one of
  // the four HandleCheckResult variants.
  const result =
    handleCheck === "checking" || handleCheck === null ? null : handleCheck;

  // Map the check state to Field's hint/error slots. Field flips its
  // border red when `error` is set — we want that for taken/reserved/
  // format issues. `available` and `yours` are positive states; they
  // ride the hint slot with a checkmark.
  const handleHint = (() => {
    if (handleCheck === "checking") return t("profile.field.handle.checking");
    if (result?.status === "available")
      return tmpl(t("profile.field.handle.available"), {
        handle: handle.trim().toLowerCase(),
      });
    if (result?.status === "yours") return t("profile.field.handle.yours");
    if (isAutoHandle) return t("profile.field.handle.hint.auto");
    return t("profile.field.handle.hint.normal");
  })();
  // Server's `invalid` carries an English reason string from the action.
  // Map the most common ones to dict keys; fall back to whatever the
  // server sent for anything unanticipated.
  const handleErrorOverride = (() => {
    if (result?.status === "taken") return t("profile.field.handle.taken");
    if (result?.status === "reserved") return t("profile.field.handle.reserved");
    if (result?.status === "invalid" && handle.trim() !== "") {
      const r = result.reason;
      if (r.includes("3 characters")) return t("profile.field.handle.tooShort");
      if (r.includes("Lowercase")) return t("profile.field.handle.badFormat");
      return r;
    }
    return undefined;
  })();

  const hasContact = !!(
    telegram.trim() ||
    whatsapp.trim() ||
    emailContact.trim()
  );

  return (
    <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[1.1fr_1fr] lg:items-start lg:gap-12">
      {/* Preview first in DOM so mobile sees the artefact before the form;
          on desktop CSS order flips it to the right column. */}
      <aside className="order-1 flex flex-col gap-3 lg:order-2 lg:sticky lg:top-6">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          {t("profile.preview.label")}
        </p>
        <LiveCardPreview
          handle={handle}
          avatarUrl={avatarUrl}
          city={city.trim() || null}
          cityUntil={cityUntil.trim() || null}
          status={bio.trim() || null}
          kinds={Array.from(selectedKinds)}
          gender={gender === "" ? null : gender}
          socialLinks={socialLinks.filter((l) => l.value.trim().length > 0)}
          hasContact={hasContact}
        />
        <p className="text-xs text-muted">
          {t("profile.preview.updates.pre")}
          <span className="font-mono text-ink/80">
            acoffee.com/{(handle.trim() || "{handle}")}
          </span>
          {t("profile.preview.updates.post")}
        </p>
      </aside>

      <form action={action} className="order-2 flex flex-col gap-8 lg:order-1">
        {after && <input type="hidden" name="after" value={after} />}

        <fieldset className="flex flex-col gap-5 border-none p-0">
          <legend className="text-xs font-medium uppercase tracking-wide text-accent">
            {t("profile.identity.legend")}
          </legend>
          <AvatarUpload
            userId={profile.id}
            handle={handle.trim() || profile.handle}
            displayName={deriveDisplayName(handle.trim() || profile.handle)}
            initialUrl={avatarUrl}
            onChange={setAvatarUrl}
          />
          <Field
            label={t("profile.field.handle.label")}
            name="handle"
            value={handle}
            onValueChange={setHandle}
            placeholder={
              isAutoHandle
                ? t("profile.field.handle.placeholder")
                : undefined
            }
            hint={handleHint}
            error={handleErrorOverride ?? errs.handle}
            required
          />
          <Field
            label={t("profile.field.city.label")}
            name="city"
            value={city}
            onValueChange={setCity}
            placeholder={t("profile.field.city.placeholder")}
            hint={t("profile.field.city.hint")}
            error={errs.city}
          />
          {/* v0.11 — optional "until" date. Only meaningful when a city
              is set; if there's no city we'd render an orphan date input
              with nothing to anchor to, so hide it until the user types
              a city. Server action also drops cityUntil when city is
              empty, so the two sides agree. */}
          {city.trim().length > 0 && (
            <Field
              label={t("profile.field.cityUntil.label")}
              name="cityUntil"
              type="date"
              value={cityUntil}
              onValueChange={setCityUntil}
              hint={t("profile.field.cityUntil.hint")}
              error={errs.cityUntil}
            />
          )}
          <FieldArea
            label={t("profile.field.status.label")}
            name="bio"
            value={bio}
            onValueChange={setBio}
            hint={t("profile.field.status.hint")}
            error={errs.bio}
          />
          {/* Gender — optional 3-way pick. Empty string submits as null
              ("prefer not to say"); the row renders nothing on the card
              in that case. */}
          <fieldset className="flex flex-col gap-2 border-none p-0">
            <legend className="text-sm font-medium text-ink/85">
              {t("profile.field.gender.label")}
            </legend>
            <div className="flex flex-wrap gap-2">
              <GenderChip
                value=""
                active={gender === ""}
                onSelect={setGender}
                label={t("profile.field.gender.opt.unset")}
              />
              {GENDERS.map((g) => (
                <GenderChip
                  key={g}
                  value={g}
                  active={gender === g}
                  onSelect={setGender}
                  label={t(`profile.field.gender.opt.${g}` as const)}
                />
              ))}
            </div>
            <p className="text-sm text-muted">
              {t("profile.field.gender.hint")}
            </p>
          </fieldset>
        </fieldset>

        <fieldset className="flex flex-col gap-3 border-none p-0">
          <legend className="text-xs font-medium uppercase tracking-wide text-accent">
            {t("profile.upFor.legend")}
          </legend>
          <div className="flex flex-wrap gap-2">
            {COFFEE_CHAT_KINDS.map((k) => {
              const active = selectedKinds.has(k);
              return (
                <label
                  key={k}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "border-accent bg-accent text-page shadow-sm"
                      : "border-bean bg-surface text-ink/80 hover:border-accent/60 hover:text-accent"
                  }`}
                >
                  <input
                    type="checkbox"
                    name="coffeeChatKinds"
                    value={k}
                    checked={active}
                    onChange={(e) => {
                      setSelectedKinds((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(k);
                        else next.delete(k);
                        return next;
                      });
                    }}
                    className="sr-only"
                  />
                  <span aria-hidden>{KIND_EMOJI[k]}</span>
                  <span>{t(`profile.kind.${k}` as const)}</span>
                </label>
              );
            })}
          </div>
          <p className="text-sm text-muted">{t("profile.upFor.hint")}</p>
        </fieldset>

        <SocialsEditor links={socialLinks} onChange={setSocialLinks} />
        {errs.socialLinks && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {errs.socialLinks}
          </p>
        )}

        <fieldset className="flex flex-col gap-5 border-none p-0">
          <legend className="text-xs font-medium uppercase tracking-wide text-accent">
            {t("profile.contact.legend")}
          </legend>
          <Field
            label={t("profile.field.telegram.label")}
            name="telegramHandle"
            value={telegram}
            onValueChange={setTelegram}
            placeholder={t("profile.field.telegram.placeholder")}
            hint={t("profile.field.telegram.hint")}
            error={errs.telegramHandle}
          />
          <Field
            label={t("profile.field.whatsapp.label")}
            name="whatsappNumber"
            value={whatsapp}
            onValueChange={setWhatsapp}
            placeholder={t("profile.field.whatsapp.placeholder")}
            hint={t("profile.field.whatsapp.hint")}
            error={errs.whatsappNumber}
          />
          <Field
            label={t("profile.field.email.label")}
            name="emailContact"
            type="email"
            value={emailContact}
            onValueChange={setEmailContact}
            placeholder={t("profile.field.email.placeholder")}
            hint={t("profile.field.email.hint")}
            error={errs.emailContact}
          />
        </fieldset>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3 text-base font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md disabled:opacity-60"
          >
            {pending
              ? t("profile.save.pending")
              : after
                ? `${t("profile.save.continue")} →`
                : t("profile.save")}
          </button>
          {state.status === "saved" && (
            <span className="text-sm font-medium text-accent">
              {state.message}
            </span>
          )}
          {state.status === "error" && state.message && !state.fieldErrors && (
            <span className="text-sm text-red-600 dark:text-red-400">
              {state.message}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type,
  value,
  onValueChange,
  placeholder,
  hint,
  error,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onValueChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-ink/85">{label}</span>
      <input
        name={name}
        type={type ?? "text"}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={`rounded-2xl border bg-surface px-4 py-3 text-base text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20 ${
          error
            ? "border-red-400 dark:border-red-500"
            : "border-bean"
        }`}
      />
      {error ? (
        <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
      ) : hint ? (
        <span className="text-sm text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

function FieldArea({
  label,
  name,
  value,
  onValueChange,
  hint,
  error,
}: {
  label: string;
  name: string;
  value: string;
  onValueChange: (v: string) => void;
  hint?: string;
  error?: string;
}) {
  const MAX = 140;
  const length = value.length;
  const near = length > MAX - 20;
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-ink/85">{label}</span>
      <textarea
        name={name}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        rows={3}
        maxLength={MAX}
        className={`resize-none rounded-2xl border bg-surface px-4 py-3 text-base leading-[1.5] text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20 ${
          error
            ? "border-red-400 dark:border-red-500"
            : "border-bean"
        }`}
      />
      <div className="flex items-baseline justify-between gap-3">
        {error ? (
          <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
        ) : hint ? (
          <span className="text-sm text-muted">{hint}</span>
        ) : (
          <span />
        )}
        <span
          className={`shrink-0 font-mono text-xs tabular-nums ${
            near ? "text-accent" : "text-muted"
          }`}
          aria-live="polite"
        >
          {length} / {MAX}
        </span>
      </div>
    </label>
  );
}

function GenderChip({
  value,
  active,
  onSelect,
  label,
}: {
  value: Gender | "";
  active: boolean;
  onSelect: (v: Gender | "") => void;
  label: string;
}) {
  return (
    <label
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-accent bg-accent text-page shadow-sm"
          : "border-bean bg-surface text-ink/80 hover:border-accent/60 hover:text-accent"
      }`}
    >
      <input
        type="radio"
        name="gender"
        value={value}
        checked={active}
        onChange={() => onSelect(value)}
        className="sr-only"
      />
      {label}
    </label>
  );
}
