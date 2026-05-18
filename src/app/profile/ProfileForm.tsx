"use client";
import { useActionState, useState } from "react";
import { LiveCardPreview } from "@/components/LiveCardPreview";
import {
  COFFEE_CHAT_KINDS,
  type CoffeeChatKind,
  type MyProfile,
} from "@/lib/types";
import { updateProfile, type ProfileState } from "./actions";

const INITIAL: ProfileState = { status: "idle" };

// Default trigger-generated handles look like "user_a1b2c3d4". Don't show
// them as a defaultValue — the user would have to manually clear before
// typing. Let placeholder guide instead, so the field starts empty and the
// real handle gets typed in one go.
const AUTO_HANDLE = /^user_[a-f0-9]{8}$/;

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
          <Field
            label="Handle"
            name="handle"
            value={handle}
            onValueChange={setHandle}
            placeholder={isAutoHandle ? "pick one · e.g. alex_nomad" : undefined}
            hint={
              isAutoHandle
                ? `Currently auto-assigned · 3–20 chars · a–z, 0–9, _`
                : "3–20 chars · a–z, 0–9, _"
            }
            error={errs.handle}
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
