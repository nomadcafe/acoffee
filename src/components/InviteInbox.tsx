"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  approveInvite,
  rejectInvite,
  resendAcceptedContact,
} from "@/app/profile/actions";
import { KIND_EMOJI } from "@/components/CardBody";
import { useLocale, useT } from "@/components/LocaleProvider";
import { trackEvent } from "@/lib/analytics";
import { formatSlot } from "@/lib/datetime";
import { tmpl } from "@/lib/i18n/dict";
import type { Invite } from "@/lib/types";

// "emoji + localised label" for the kind the visitor asked for, or null
// for pre-v12 invites that have no kind (those rows just omit the chip).
function kindLabel(
  kind: Invite["requestedKind"],
  t: ReturnType<typeof useT>,
): string | null {
  if (!kind) return null;
  return `${KIND_EMOJI[kind]} ${t(`profile.kind.${kind}` as const)}`;
}

// "unconfirmed" should never reach the inbox — getMyInviteHistory filters
// it out — but TypeScript needs the union to be exhaustive. Map it to the
// muted "expired" treatment as a defensive fallback so a stray row doesn't
// crash the render.
const STATUS_TONE: Record<
  Exclude<Invite["status"], "pending">,
  "good" | "muted"
> = {
  accepted: "good",
  declined: "muted",
  expired: "muted",
  unconfirmed: "muted",
};

// Owner inbox for invites — split into Pending and History tabs. Pending
// is the action surface (Accept / Decline). History is read-only: shows
// status badges + when decided, no buttons. Default tab is Pending; if
// there's nothing pending we land on History so a returning host with
// no new requests still sees their record.
export function InviteInbox({
  pending,
  history,
  timezone,
}: {
  pending: Invite[];
  history: Invite[];
  // v16 — host's own tz, used to render booked slot times in the row.
  timezone: string | null;
}) {
  const t = useT();
  const defaultTab: "pending" | "history" =
    pending.length === 0 && history.length > 0 ? "history" : "pending";
  const [tab, setTab] = useState<"pending" | "history">(defaultTab);

  if (pending.length === 0 && history.length === 0) {
    return (
      <section className="rounded-3xl border border-bean bg-surface p-5 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          {t("inbox.eyebrow")}
        </p>
        <p className="mt-2 text-sm text-muted">{t("inbox.empty.both")}</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-accent/40 bg-accent-soft/40 p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          {t("inbox.eyebrow")}
        </p>
        <p className="text-xs text-muted">{t("inbox.expireNote")}</p>
      </div>

      <div className="flex items-center gap-1 self-start rounded-full border border-bean bg-surface p-1">
        <TabButton
          active={tab === "pending"}
          onClick={() => setTab("pending")}
          label={t("inbox.tab.pending")}
          count={pending.length}
        />
        <TabButton
          active={tab === "history"}
          onClick={() => setTab("history")}
          label={t("inbox.tab.history")}
          count={history.length}
        />
      </div>

      {tab === "pending" ? (
        <PendingList invites={pending} timezone={timezone} />
      ) : (
        <HistoryList invites={history} timezone={timezone} />
      )}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-accent text-page shadow-sm"
          : "text-ink/70 hover:text-accent"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
          active
            ? "bg-page/20 text-page"
            : "bg-bean/60 text-ink/70"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function PendingList({
  invites,
  timezone,
}: {
  invites: Invite[];
  timezone: string | null;
}) {
  const t = useT();
  if (invites.length === 0) {
    return <p className="text-sm text-muted">{t("inbox.empty.pending")}</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {invites.map((inv) => (
        <li key={inv.id}>
          <PendingRow invite={inv} timezone={timezone} />
        </li>
      ))}
    </ul>
  );
}

function HistoryList({
  invites,
  timezone,
}: {
  invites: Invite[];
  timezone: string | null;
}) {
  const t = useT();
  if (invites.length === 0) {
    return <p className="text-sm text-muted">{t("inbox.empty.history")}</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {invites.map((inv) => (
        <li key={inv.id}>
          <HistoryRow invite={inv} timezone={timezone} />
        </li>
      ))}
    </ul>
  );
}

function PendingRow({
  invite,
  timezone,
}: {
  invite: Invite;
  timezone: string | null;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [decided, setDecided] = useState<"accepted" | "declined" | null>(
    null,
  );
  // On accept, false means the contact-delivery email failed — we keep the
  // row in place (don't refresh it away) and offer an inline resend.
  const [emailFailed, setEmailFailed] = useState(false);

  function decide(next: "accepted" | "declined") {
    setError(null);
    startTransition(async () => {
      const action = next === "accepted" ? approveInvite : rejectInvite;
      const result = await action(invite.id);
      if (result.status === "ok") {
        // Funnel event fires only on confirmed-success — surface inline
        // errors don't pollute the metric.
        trackEvent(
          next === "accepted" ? "invite_accepted" : "invite_declined",
          { kind: invite.requestedKind ?? "unknown" },
        );
        const failed = next === "accepted" && result.emailDelivered === false;
        setEmailFailed(failed);
        setDecided(next);
        // Only refresh away the row when the hand-off succeeded; a failed
        // accept stays put so the host can resend without hunting History.
        if (!failed) router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  if (decided) {
    if (decided === "accepted" && emailFailed) {
      return (
        <div className="flex flex-col gap-2 rounded-2xl border border-amber-400/60 bg-amber-50 px-4 py-3 dark:bg-amber-950/30">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {tmpl(t("inbox.delivery.acceptedWarn"), {
              name: invite.requesterName,
            })}
          </p>
          <ResendContact invite={invite} />
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-bean bg-surface px-4 py-3 text-sm text-muted">
        {tmpl(
          t(
            decided === "accepted"
              ? "inbox.confirm.accepted"
              : "inbox.confirm.declined",
          ),
          { name: invite.requesterName },
        )}
      </div>
    );
  }

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-bean bg-surface p-4 sm:p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-base font-semibold text-ink">
          {invite.requesterName}
        </p>
        <p className="text-xs text-muted">
          {timeAgo(invite.createdAt, t)}
          {kindLabel(invite.requestedKind, t)
            ? ` · ${kindLabel(invite.requestedKind, t)}`
            : ""}
        </p>
      </header>

      <p className="text-sm leading-[1.55] text-ink/80">
        “{invite.requesterTopic}”
      </p>

      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <div className="flex gap-1.5">
          <dt className="text-muted">{t("inbox.row.email")}</dt>
          <dd>
            <a
              href={`mailto:${invite.requesterEmail}`}
              className="text-accent hover:underline"
            >
              {invite.requesterEmail}
            </a>
          </dd>
        </div>
        {invite.slotStartsAt ? (
          <div className="flex gap-1.5">
            <dt className="text-muted">{t("inbox.row.when")}</dt>
            <dd className="text-ink/80">
              {formatSlot(invite.slotStartsAt, timezone, locale)}
            </dd>
          </div>
        ) : invite.preferredTime ? (
          <div className="flex gap-1.5">
            <dt className="text-muted">{t("inbox.row.when")}</dt>
            <dd className="text-ink/80">{invite.preferredTime}</dd>
          </div>
        ) : null}
      </dl>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          disabled={pending}
          onClick={() => decide("accepted")}
          className="inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-2 text-sm font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md disabled:opacity-60"
        >
          {pending ? "…" : t("inbox.action.accept")}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => decide("declined")}
          className="inline-flex items-center gap-2 rounded-2xl border border-bean bg-surface px-4 py-2 text-sm font-medium text-ink/85 hover:border-accent/60 hover:text-accent disabled:opacity-60"
        >
          {t("inbox.action.decline")}
        </button>
      </div>
    </article>
  );
}

function HistoryRow({
  invite,
  timezone,
}: {
  invite: Invite;
  timezone: string | null;
}) {
  const t = useT();
  const locale = useLocale();
  // Pending here means past-expiry (the query only surfaces those into
  // history); unconfirmed shouldn't reach this row but treat it as
  // expired defensively so we never index status keys we don't ship.
  const statusKind: Exclude<Invite["status"], "pending" | "unconfirmed"> =
    invite.status === "pending" || invite.status === "unconfirmed"
      ? "expired"
      : invite.status;
  const tone = STATUS_TONE[statusKind];
  const decidedDate =
    invite.decidedAt ?? invite.expiresAt ?? invite.createdAt;
  return (
    <article className="flex flex-col gap-2 rounded-2xl border border-bean bg-surface/70 p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-base font-medium text-ink/85">
          {invite.requesterName}
        </p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
            tone === "good"
              ? "bg-accent-soft text-accent"
              : "bg-bean/60 text-ink/70"
          }`}
        >
          {t(`inbox.status.${statusKind}` as const)}
        </span>
      </header>
      <p className="text-sm leading-[1.5] text-ink/70 line-clamp-2">
        “{invite.requesterTopic}”
      </p>
      <p className="text-xs text-muted">
        {kindLabel(invite.requestedKind, t)
          ? `${kindLabel(invite.requestedKind, t)} · `
          : ""}
        {formatDate(decidedDate)}
      </p>
      {invite.slotStartsAt && (
        <p className="text-xs text-muted">
          {t("inbox.row.when")}{" "}
          {formatSlot(invite.slotStartsAt, timezone, locale)}
        </p>
      )}
      {/* A recorded send error on an accepted invite means the visitor
          never got the contact hand-off — surface it with a resend. Rows
          accepted before v14 have no error recorded, so they don't flag. */}
      {invite.status === "accepted" && invite.lastEmailError && (
        <div className="mt-1 flex flex-col gap-2 rounded-xl border border-amber-400/60 bg-amber-50 px-3 py-2 dark:bg-amber-950/30">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            {tmpl(t("inbox.delivery.failed"), { name: invite.requesterName })}
          </p>
          <ResendContact invite={invite} />
        </div>
      )}
    </article>
  );
}

// Shared resend control for an accepted invite whose contact email failed.
// Used both in the just-accepted warning (PendingRow) and the History row.
// On success it shows a confirmation; router.refresh() then re-reads the
// row, which now has contact_emailed_at set and clears the warning.
function ResendContact({ invite }: { invite: Invite }) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  function resend() {
    setError(null);
    startTransition(async () => {
      const result = await resendAcceptedContact(invite.id);
      if (result.status === "ok") {
        setResent(true);
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  if (resent) {
    return (
      <p className="text-xs font-medium text-accent">
        {t("inbox.delivery.resent")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={resend}
        disabled={pending}
        className="inline-flex w-fit items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-medium text-page shadow-sm hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? t("inbox.delivery.resending") : t("inbox.delivery.resend")}
      </button>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

// Compact relative time. The dict carries the localised template — only
// the absolute timestamps stay numeric so word order works for languages
// that place "ago" before the number ("3 分钟前" / "3 minutes ago").
function timeAgo(iso: string, t: ReturnType<typeof useT>): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return t("time.justNow");
  if (mins < 60) return tmpl(t("time.minutesAgo"), { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return tmpl(t("time.hoursAgo"), { n: hours });
  const days = Math.floor(hours / 24);
  return tmpl(t("time.daysAgo"), { n: days });
}

// Decided rows can live forever — render absolute date so the host can
// orient ("did I accept this last week or last month?"). Browser's
// Intl.DateTimeFormat picks the right month name per locale; passing
// undefined lets the platform default kick in.
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
