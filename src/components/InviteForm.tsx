"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { createInvite, type CreateInviteState } from "@/app/[handle]/actions";
import { KIND_EMOJI } from "@/components/CardBody";
import { useT } from "@/components/LocaleProvider";
import { trackEvent } from "@/lib/analytics";
import { tmpl } from "@/lib/i18n/dict";
import { type CoffeeChatKind } from "@/lib/types";

// What /[handle]/page.tsx passes when the viewer is a signed-in
// acoffee user who isn't the card owner. The presence of this object
// switches the form into the "skip email confirm" path — auth email
// is pre-filled and locked, name pre-fills to the viewer's display
// name, and submission goes straight to the host (no AA2 round-trip).
export type VisitorSession = {
  handle: string;
  displayName: string;
  email: string;
};

// Public-facing invite form. Replaces the v0.7 client-side reveal — the
// host's contact channels are no longer shipped to the browser; visitors
// submit name + email + topic + mode + optional time, and only get the
// channels via email after the host accepts. Form lives inline on the
// /[handle] card (expands below the Invite button on click) so there's
// no page navigation between "I want to invite" and "I've inviting".

const INITIAL: CreateInviteState = { status: "idle" };

// The visitor picks from the kinds the host advertised on their card.
// A host with no kinds set still needs something to ask for, so fall
// back to a lone "coffee" — the namesake and safest default.
function effectiveKinds(kinds: CoffeeChatKind[]): CoffeeChatKind[] {
  return kinds.length > 0 ? kinds : ["coffee"];
}

// Outer wrapper carries a reset key — when the user clicks "Send another"
// after a successful submission we bump the key, which unmounts and
// remounts the inner form. useActionState resets to INITIAL with the new
// mount, the controlled FieldArea clears, and the user gets a fresh form
// without a page navigation. Cheaper than threading reset logic through
// every controlled input.
export function InviteForm(props: {
  hostHandle: string;
  hostDisplayName: string;
  hostKinds: CoffeeChatKind[];
  visitorSession: VisitorSession | null;
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
  hostKinds,
  visitorSession,
  onSendAnother,
}: {
  hostHandle: string;
  hostDisplayName: string;
  hostKinds: CoffeeChatKind[];
  visitorSession: VisitorSession | null;
  onSendAnother: () => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createInvite, INITIAL);
  const kinds = effectiveKinds(hostKinds);
  const [kind, setKind] = useState<CoffeeChatKind>(kinds[0]);
  // Track the email the visitor just submitted, so the success state can
  // tell them "check this inbox" without us re-deriving it from FormData
  // (it's already wiped by the time we render the result).
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  // Fire the GA4 event once when the action transitions to `sent`.
  // Effect dependency is state.status — re-runs only on transition, so
  // the resetCount remount strategy means a second invite from the same
  // session fires its own event after the form remounts.
  useEffect(() => {
    if (state.status === "sent") {
      trackEvent("invite_sent", {
        skip_confirm: state.needsConfirm === false,
      });
    }
  }, [state]);

  if (state.status === "sent") {
    // Two success shapes: when the visitor is signed in we skip the
    // email-confirm round-trip, so the message reads "sent to the host
    // — they'll reply by email when they accept". Falls back to the
    // existing AA2 confirm copy for anonymous visitors.
    const skipConfirm = state.needsConfirm === false;
    return (
      <div className="flex flex-col gap-3 rounded-3xl border border-accent/40 bg-accent-soft/60 p-5">
        <p className="text-base font-semibold text-accent">
          {skipConfirm
            ? t("invite.sent.direct.title")
            : t("invite.sent.check.title")}
        </p>
        <p className="text-sm leading-[1.55] text-ink/80">
          {skipConfirm
            ? tmpl(t("invite.sent.direct.body"), { name: hostDisplayName })
            : tmpl(t("invite.sent.check.body"), {
                name: hostDisplayName,
                email: submittedEmail ?? "your inbox",
              })}
        </p>
        {!skipConfirm && (
          <p className="text-xs text-muted">{t("invite.sent.check.ttl")}</p>
        )}
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
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">
            {visitorSession
              ? tmpl(t("invite.gate.signedInAs"), {
                  handle: visitorSession.handle,
                })
              : t("invite.gate.text")}
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md"
          >
            {t("invite.gate.cta")}
            <span aria-hidden>→</span>
          </button>
        </div>
        {!visitorSession && (
          // Quiet sign-in nudge for acoffee users — clicking goes to
          // /auth/signin?next=/{thisHandle}, bringing them back here
          // signed in so the form auto-fills and skips the AA2 confirm.
          <p className="text-xs text-muted">
            {t("invite.gate.signinPrompt")}{" "}
            <Link
              href={`/auth/signin?next=${encodeURIComponent(`/${hostHandle}`)}`}
              className="font-medium text-accent underline-offset-4 hover:underline"
            >
              {t("invite.gate.signinLink")}
            </Link>
          </p>
        )}
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

      {visitorSession && (
        // Signed-in banner. Tells the visitor (1) which acoffee
        // identity they're sending from, (2) that the email confirm
        // step is skipped. Lives above the form fields so it's seen
        // before they look at the inputs.
        <div className="rounded-2xl border border-accent/40 bg-accent-soft/40 px-3 py-2.5 text-xs text-ink/85">
          {tmpl(t("invite.form.signedIn"), {
            handle: visitorSession.handle,
          })}
        </div>
      )}

      <Field
        label={t("invite.form.name.label")}
        name="requesterName"
        placeholder={t("invite.form.name.placeholder")}
        error={errs.requesterName}
        required
        defaultValue={visitorSession?.displayName}
      />
      <Field
        label={t("invite.form.email.label")}
        name="requesterEmail"
        type="email"
        placeholder={t("invite.form.email.placeholder")}
        hint={
          visitorSession
            ? t("invite.form.email.locked")
            : tmpl(t("invite.form.email.hint"), { name: hostDisplayName })
        }
        error={errs.requesterEmail}
        required
        defaultValue={visitorSession?.email}
        readOnly={!!visitorSession}
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
          {tmpl(t("invite.form.kind.legend"), { name: hostDisplayName })}
        </legend>
        <div className="flex flex-wrap gap-2">
          {kinds.map((k) => {
            const active = kind === k;
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
                  type="radio"
                  name="requestedKind"
                  value={k}
                  checked={active}
                  onChange={() => setKind(k)}
                  className="sr-only"
                />
                <span aria-hidden>{KIND_EMOJI[k]}</span>
                <span>{t(`profile.kind.${k}` as const)}</span>
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
  defaultValue,
  readOnly,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  defaultValue?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink/85">{label}</span>
      <input
        name={name}
        type={type ?? "text"}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        readOnly={readOnly}
        className={`rounded-2xl border px-4 py-3 text-base text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20 ${
          readOnly ? "bg-bean/30 cursor-not-allowed" : "bg-surface"
        } ${
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
