"use client";
import { useActionState, useState } from "react";
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
  const [selectedKinds, setSelectedKinds] = useState<Set<CoffeeChatKind>>(
    () => new Set(profile.coffeeChatKinds),
  );

  return (
    <form action={action} className="flex flex-col gap-7">
      {after && <input type="hidden" name="after" value={after} />}

      <fieldset className="flex flex-col gap-5 border-none p-0">
        <legend className="font-mono text-[11px] uppercase tracking-widest text-muted">
          Identity
        </legend>
        <Field
          label="Handle"
          name="handle"
          defaultValue={isAutoHandle ? "" : profile.handle}
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
          defaultValue={profile.city ?? ""}
          placeholder="Chiang Mai"
          hint="Where you want to be found — leave blank if you're between cities"
          error={errs.city}
        />
        <FieldArea
          label="Status"
          name="bio"
          defaultValue={profile.bio ?? ""}
          hint="One line · ≤ 140 chars · what you're doing, what you're up for"
          error={errs.bio}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-3 border-none p-0">
        <legend className="font-mono text-[11px] uppercase tracking-widest text-muted">
          What you&apos;re up for
        </legend>
        <div className="flex flex-wrap gap-2">
          {COFFEE_CHAT_KINDS.map((k) => {
            const meta = KIND_LABELS[k];
            const active = selectedKinds.has(k);
            return (
              <label
                key={k}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-bean bg-surface text-ink/85 hover:border-accent/60"
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
        <p className="text-xs text-muted">
          Pick any. Shown as chips on your public card.
        </p>
      </fieldset>

      <fieldset className="flex flex-col gap-5 border-none p-0">
        <legend className="font-mono text-[11px] uppercase tracking-widest text-muted">
          Contact · revealed only after invite
        </legend>
        <Field
          label="Telegram"
          name="telegramHandle"
          defaultValue={profile.telegramHandle ?? ""}
          placeholder="@yourhandle"
          hint="Recommended · 5–32 letters/digits/_, no spaces"
          error={errs.telegramHandle}
        />
        <Field
          label="WhatsApp"
          name="whatsappNumber"
          defaultValue={profile.whatsappNumber ?? ""}
          placeholder="+66812345678"
          hint="Recommended · include country code with +"
          error={errs.whatsappNumber}
        />
        <Field
          label="Email"
          name="emailContact"
          type="email"
          defaultValue={profile.emailContact ?? ""}
          placeholder="you@example.com"
          hint="Optional · a public contact email — can differ from sign-in"
          error={errs.emailContact}
        />
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Saving…" : after ? "Save & continue →" : "Save"}
        </button>
        {state.status === "saved" && (
          <span className="text-sm text-accent">
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
  );
}

function Field({
  label,
  name,
  type,
  defaultValue,
  placeholder,
  hint,
  error,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink/85">
        {label}
      </span>
      <input
        name={name}
        type={type ?? "text"}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className={`rounded-full border bg-surface px-4 py-2 text-sm outline-none focus:border-accent dark:bg-bean/40 ${
          error
            ? "border-red-400 dark:border-red-500"
            : "border-bean"
        }`}
      />
      {error ? (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      ) : hint ? (
        <span className="text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

function FieldArea({
  label,
  name,
  defaultValue,
  hint,
  error,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  hint?: string;
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink/85">
        {label}
      </span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={3}
        maxLength={140}
        className={`rounded-2xl border bg-surface px-4 py-2 text-sm outline-none focus:border-accent dark:bg-bean/40 ${
          error
            ? "border-red-400 dark:border-red-500"
            : "border-bean"
        }`}
      />
      {error ? (
        <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
      ) : hint ? (
        <span className="text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
}
