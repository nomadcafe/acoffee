"use client";
import { useActionState, useEffect, useState } from "react";
import { AvatarUpload } from "@/components/AvatarUpload";
import { LiveCardPreview } from "@/components/LiveCardPreview";
import {
  COFFEE_CHAT_KINDS,
  type CoffeeChatKind,
  type MyProfile,
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

const KIND_LABELS: Record<CoffeeChatKind, { emoji: string; label: string }> = {
  coffee: { emoji: "☕", label: "Coffee" },
  cowork: { emoji: "💻", label: "Cowork" },
  dinner: { emoji: "🍜", label: "Dinner" },
  hike: { emoji: "🥾", label: "Hike" },
  work_talk: { emoji: "💼", label: "Work talk" },
};

export function ProfileForm({
  profile,
  after,
}: {
  profile: MyProfile;
  after?: string;
}) {
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
  const [bio, setBio] = useState(profile.bio ?? "");
  const [telegram, setTelegram] = useState(profile.telegramHandle ?? "");
  const [whatsapp, setWhatsapp] = useState(profile.whatsappNumber ?? "");
  const [emailContact, setEmailContact] = useState(profile.emailContact ?? "");
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
    if (handleCheck === "checking") return "Checking…";
    if (result?.status === "available")
      return `Available ✓ · acoffee.com/${handle.trim().toLowerCase()}`;
    if (result?.status === "yours") return "That's your current handle.";
    if (isAutoHandle) {
      return "Currently auto-assigned · 3–20 chars · a–z, 0–9, _";
    }
    return "3–20 chars · a–z, 0–9, _";
  })();
  const handleErrorOverride = (() => {
    if (result?.status === "taken")
      return "That handle is taken — try another.";
    if (result?.status === "reserved")
      return "That handle is reserved — try another.";
    if (result?.status === "invalid" && handle.trim() !== "")
      return result.reason;
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
          Live preview
        </p>
        <LiveCardPreview
          handle={handle}
          avatarUrl={avatarUrl}
          city={city.trim() || null}
          status={bio.trim() || null}
          kinds={Array.from(selectedKinds)}
          hasContact={hasContact}
        />
        <p className="text-xs text-muted">
          Updates as you type. This is what visitors see at{" "}
          <span className="font-mono text-ink/80">
            acoffee.com/{(handle.trim() || "{handle}")}
          </span>
          .
        </p>
      </aside>

      <form action={action} className="order-2 flex flex-col gap-8 lg:order-1">
        {after && <input type="hidden" name="after" value={after} />}

        <fieldset className="flex flex-col gap-5 border-none p-0">
          <legend className="text-xs font-medium uppercase tracking-wide text-accent">
            Identity
          </legend>
          <AvatarUpload
            userId={profile.id}
            handle={handle.trim() || profile.handle}
            displayName={deriveDisplayName(handle.trim() || profile.handle)}
            initialUrl={avatarUrl}
            onChange={setAvatarUrl}
          />
          <Field
            label="Handle"
            name="handle"
            value={handle}
            onValueChange={setHandle}
            placeholder={isAutoHandle ? "pick one · e.g. alex_nomad" : undefined}
            hint={handleHint}
            error={handleErrorOverride ?? errs.handle}
            required
          />
          <Field
            label="City"
            name="city"
            value={city}
            onValueChange={setCity}
            placeholder="Chiang Mai"
            hint="Where you want to be found — leave blank if you're between cities"
            error={errs.city}
          />
          <FieldArea
            label="Status"
            name="bio"
            value={bio}
            onValueChange={setBio}
            hint="One line · what you're doing, what you're up for"
            error={errs.bio}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-3 border-none p-0">
          <legend className="text-xs font-medium uppercase tracking-wide text-accent">
            What you&apos;re up for
          </legend>
          <div className="flex flex-wrap gap-2">
            {COFFEE_CHAT_KINDS.map((k) => {
              const meta = KIND_LABELS[k];
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
                  <span aria-hidden>{meta.emoji}</span>
                  <span>{meta.label}</span>
                </label>
              );
            })}
          </div>
          <p className="text-sm text-muted">
            Pick any — they show up as chips on your public card.
          </p>
        </fieldset>

        <fieldset className="flex flex-col gap-5 border-none p-0">
          <legend className="text-xs font-medium uppercase tracking-wide text-accent">
            Contact · revealed only after invite
          </legend>
          <Field
            label="Telegram"
            name="telegramHandle"
            value={telegram}
            onValueChange={setTelegram}
            placeholder="@yourhandle"
            hint="Recommended · 5–32 letters/digits/_, no spaces"
            error={errs.telegramHandle}
          />
          <Field
            label="WhatsApp"
            name="whatsappNumber"
            value={whatsapp}
            onValueChange={setWhatsapp}
            placeholder="+66812345678"
            hint="Recommended · include country code with +"
            error={errs.whatsappNumber}
          />
          <Field
            label="Email"
            name="emailContact"
            type="email"
            value={emailContact}
            onValueChange={setEmailContact}
            placeholder="you@example.com"
            hint="Optional · a public contact email — can differ from sign-in"
            error={errs.emailContact}
          />
        </fieldset>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3 text-base font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md disabled:opacity-60"
          >
            {pending ? "Saving…" : after ? "Save & continue →" : "Save"}
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
