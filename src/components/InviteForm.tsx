"use client";

import { useActionState, useState } from "react";
import { createInvite, type CreateInviteState } from "@/app/[handle]/actions";
import { useT } from "@/components/LocaleProvider";
import { tmpl } from "@/lib/i18n/dict";
import { INVITE_MODES, type InviteMode } from "@/lib/types";

// Public-facing invite form. Replaces the v0.7 client-side reveal — the
// host's contact channels are no longer shipped to the browser; visitors
// submit name + email + topic + mode + optional time, and only get the
// channels via email after the host accepts. Form lives inline on the
// /[handle] card (expands below the Invite button on click) so there's
// no page navigation between "I want to invite" and "I've inviting".
const MODE_EMOJI: Record<InviteMode, string> = {
  online: "💻",
  in_person: "🍵",
  either: "🤷",
};

const INITIAL: CreateInviteState = { status: "idle" };

// Outer wrapper carries a reset key — when the user clicks "Send another"
// after a successful submission we bump the key, which unmounts and
// remounts the inner form. useActionState resets to INITIAL with the new
// mount, the controlled FieldArea clears, and the user gets a fresh form
// without a page navigation. Cheaper than threading reset logic through
// every controlled input.
export function InviteForm(props: {
  hostHandle: string;
  hostDisplayName: string;
}) {
  const [resetCount, setResetCount] = useState(0);
  return (
    <InviteFormInner
      key={resetCount}
      {...props}
      onSendAnother={() => setResetCount((n) => n + 1)}
    />
  );
}

function InviteFormInner({
  hostHandle,
  hostDisplayName,
  onSendAnother,
}: {
  hostHandle: string;
  hostDisplayName: string;
  onSendAnother: () => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createInvite, INITIAL);
  const [mode, setMode] = useState<InviteMode>("either");
  // Track the email the visitor just submitted, so the success state can
  // tell them "check this inbox" without us re-deriving it from FormData
  // (it's already wiped by the time we render the result).
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  if (state.status === "sent") {
    return (
      <div className="flex flex-col gap-3 rounded-3xl border border-accent/40 bg-accent-soft/60 p-5">
        <p className="text-base font-semibold text-accent">
          {t("invite.sent.check.title")}
        </p>
        <p className="text-sm leading-[1.55] text-ink/80">
          {tmpl(t("invite.sent.check.body"), {
            name: hostDisplayName,
            email: submittedEmail ?? "your inbox",
          })}
        </p>
        <p className="text-xs text-muted">{t("invite.sent.check.ttl")}</p>
        <button
          type="button"
          onClick={onSendAnother}
          className="self-start text-sm font-medium text-accent underline-offset-4 hover:underline"
        >
          {t("invite.sent.check.sendAnother")}
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">{t("invite.gate.text")}</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md"
        >
          {t("invite.gate.cta")}
          <span aria-hidden>→</span>
        </button>
      </div>
    );
  }

  const errs = state.status === "error" ? state.fieldErrors ?? {} : {};

  return (
    <form
      action={(formData) => {
        // Stash the visitor's email so the success state can render
        // "check {email} for the confirm link". useActionState's
        // FormData is wiped by the time the success view paints.
        setSubmittedEmail(
          (formData.get("requesterEmail") as string | null) ?? null,
        );
        return action(formData);
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="handle" value={hostHandle} />

      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          {tmpl(t("invite.form.title"), { name: hostDisplayName })}
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-medium text-muted hover:text-accent"
        >
          {t("invite.form.cancel")}
        </button>
      </div>

      <Field
        label={t("invite.form.name.label")}
        name="requesterName"
        placeholder={t("invite.form.name.placeholder")}
        error={errs.requesterName}
        required
      />
      <Field
        label={t("invite.form.email.label")}
        name="requesterEmail"
        type="email"
        placeholder={t("invite.form.email.placeholder")}
        hint={tmpl(t("invite.form.email.hint"), { name: hostDisplayName })}
        error={errs.requesterEmail}
        required
      />
      <FieldArea
        label={t("invite.form.topic.label")}
        name="requesterTopic"
        placeholder={t("invite.form.topic.placeholder")}
        error={errs.requesterTopic}
        required
        maxLength={280}
      />

      <fieldset className="flex flex-col gap-2 border-none p-0">
        <legend className="text-sm font-medium text-ink/85">
          {t("invite.form.mode.legend")}
        </legend>
        <div className="flex flex-wrap gap-2">
          {INVITE_MODES.map((m) => {
            const active = mode === m;
            return (
              <label
                key={m}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-accent bg-accent text-page shadow-sm"
                    : "border-bean bg-surface text-ink/80 hover:border-accent/60 hover:text-accent"
                }`}
              >
                <input
                  type="radio"
                  name="mode"
                  value={m}
                  checked={active}
                  onChange={() => setMode(m)}
                  className="sr-only"
                />
                <span aria-hidden>{MODE_EMOJI[m]}</span>
                <span>{t(`invite.form.mode.${m}` as const)}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <Field
        label={t("invite.form.time.label")}
        name="preferredTime"
        placeholder={t("invite.form.time.placeholder")}
        hint={t("invite.form.time.hint")}
        error={errs.preferredTime}
      />

      {state.status === "error" && !state.fieldErrors && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {state.message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3 text-base font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md disabled:opacity-60"
        >
          {pending
            ? t("invite.form.submit.pending")
            : `${t("invite.form.submit")} →`}
        </button>
        <p className="text-xs text-muted">{t("invite.form.note")}</p>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type,
  placeholder,
  hint,
  error,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink/85">{label}</span>
      <input
        name={name}
        type={type ?? "text"}
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
  placeholder,
  error,
  required,
  maxLength,
}: {
  label: string;
  name: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  maxLength?: number;
}) {
  const [value, setValue] = useState("");
  const length = value.length;
  const near = maxLength ? length > maxLength - 20 : false;
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink/85">{label}</span>
      <textarea
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        required={required}
        rows={4}
        maxLength={maxLength}
        className={`resize-none rounded-2xl border bg-surface px-4 py-3 text-base leading-[1.5] text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20 ${
          error
            ? "border-red-400 dark:border-red-500"
            : "border-bean"
        }`}
      />
      <div className="flex items-baseline justify-between gap-3">
        {error ? (
          <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
        ) : (
          <span />
        )}
        {maxLength && (
          <span
            className={`shrink-0 font-mono text-xs tabular-nums ${
              near ? "text-accent" : "text-muted"
            }`}
            aria-live="polite"
          >
            {length} / {maxLength}
          </span>
        )}
      </div>
    </label>
  );
}
