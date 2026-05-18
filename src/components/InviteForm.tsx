"use client";

import { useActionState, useState } from "react";
import { createInvite, type CreateInviteState } from "@/app/[handle]/actions";
import { INVITE_MODES, type InviteMode } from "@/lib/types";

// Public-facing invite form. Replaces the v0.7 client-side reveal — the
// host's contact channels are no longer shipped to the browser; visitors
// submit name + email + topic + mode + optional time, and only get the
// channels via email after the host accepts. Form lives inline on the
// /[handle] card (expands below the Invite button on click) so there's
// no page navigation between "I want to invite" and "I've inviting".
const MODE_META: Record<InviteMode, { emoji: string; label: string }> = {
  online: { emoji: "💻", label: "Online" },
  in_person: { emoji: "🍵", label: "In person" },
  either: { emoji: "🤷", label: "Either" },
};

const INITIAL: CreateInviteState = { status: "idle" };

export function InviteForm({
  hostHandle,
  hostDisplayName,
}: {
  hostHandle: string;
  hostDisplayName: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createInvite, INITIAL);
  const [mode, setMode] = useState<InviteMode>("either");

  if (state.status === "sent") {
    return (
      <div className="flex flex-col gap-3 rounded-3xl border border-accent/40 bg-accent-soft/60 p-5">
        <p className="text-base font-semibold text-accent">
          Invite sent ✓
        </p>
        <p className="text-sm leading-[1.55] text-ink/80">
          {hostDisplayName} will get your invite by email. If they
          accept, their contact channels land in your inbox. If not,
          you&apos;ll get a polite note either way.
        </p>
        <p className="text-xs text-muted">
          Pending invites expire after 7 days.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">
          Contact unlocks on accepted invite
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md"
        >
          Invite for coffee
          <span aria-hidden>→</span>
        </button>
      </div>
    );
  }

  const errs =
    state.status === "error" ? state.fieldErrors ?? {} : {};

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="handle" value={hostHandle} />

      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          Invite {hostDisplayName} for coffee
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-medium text-muted hover:text-accent"
        >
          Cancel
        </button>
      </div>

      <Field
        label="Your name"
        name="requesterName"
        placeholder="Alex"
        error={errs.requesterName}
        required
      />
      <Field
        label="Your email"
        name="requesterEmail"
        type="email"
        placeholder="alex@example.com"
        hint={`${hostDisplayName} will reply here if they accept.`}
        error={errs.requesterEmail}
        required
      />
      <FieldArea
        label="What you'd like to chat about"
        name="requesterTopic"
        placeholder="I'm starting a domains-focused newsletter and would love to swap notes — saw your card via your tweet."
        error={errs.requesterTopic}
        required
        maxLength={280}
      />

      <fieldset className="flex flex-col gap-2 border-none p-0">
        <legend className="text-sm font-medium text-ink/85">
          How do you want to meet?
        </legend>
        <div className="flex flex-wrap gap-2">
          {INVITE_MODES.map((m) => {
            const meta = MODE_META[m];
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
                <span aria-hidden>{meta.emoji}</span>
                <span>{meta.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <Field
        label="Preferred time (optional)"
        name="preferredTime"
        placeholder="Tue / Thu afternoons · or any morning next week"
        hint="Free-form — both sides nail down the exact slot after accept."
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
          {pending ? "Sending…" : "Send invite →"}
        </button>
        <p className="text-xs text-muted">
          No account needed — your email is just for the reply.
        </p>
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
