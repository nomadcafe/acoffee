"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { approveInvite, rejectInvite } from "@/app/profile/actions";
import type { Invite } from "@/lib/types";

const MODE_LABEL: Record<Invite["mode"], string> = {
  online: "💻 Online",
  in_person: "🍵 In person",
  either: "🤷 Either",
};

const STATUS_BADGE: Record<
  Exclude<Invite["status"], "pending">,
  { label: string; tone: "good" | "muted" }
> = {
  accepted: { label: "Accepted ✓", tone: "good" },
  declined: { label: "Declined", tone: "muted" },
  expired: { label: "Expired", tone: "muted" },
};

// Owner inbox for invites — split into Pending and History tabs. Pending
// is the action surface (Accept / Decline). History is read-only: shows
// status badges + when decided, no buttons. Default tab is Pending; if
// there's nothing pending we land on History so a returning host with
// no new requests still sees their record.
export function InviteInbox({
  pending,
  history,
}: {
  pending: Invite[];
  history: Invite[];
}) {
  const defaultTab: "pending" | "history" =
    pending.length === 0 && history.length > 0 ? "history" : "pending";
  const [tab, setTab] = useState<"pending" | "history">(defaultTab);

  // No invites at all yet — collapse the section to the friendly nudge
  // (history is empty too, so the tab UI would be visual noise).
  if (pending.length === 0 && history.length === 0) {
    return (
      <section className="rounded-3xl border border-bean bg-surface p-5 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          Inbox
        </p>
        <p className="mt-2 text-sm text-muted">
          No invites yet. When someone fills your invite form on{" "}
          <span className="font-mono text-ink/80">
            acoffee.com/{`{handle}`}
          </span>{" "}
          they&apos;ll show up here for you to accept or decline.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-accent/40 bg-accent-soft/40 p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          Inbox
        </p>
        <p className="text-xs text-muted">
          Pending invites expire after 7 days
        </p>
      </div>

      <div className="flex items-center gap-1 self-start rounded-full border border-bean bg-surface p-1">
        <TabButton
          active={tab === "pending"}
          onClick={() => setTab("pending")}
          label="Pending"
          count={pending.length}
        />
        <TabButton
          active={tab === "history"}
          onClick={() => setTab("history")}
          label="History"
          count={history.length}
        />
      </div>

      {tab === "pending" ? (
        <PendingList invites={pending} />
      ) : (
        <HistoryList invites={history} />
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

function PendingList({ invites }: { invites: Invite[] }) {
  if (invites.length === 0) {
    return (
      <p className="text-sm text-muted">
        Nothing to decide right now. Past invites are in the History tab.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {invites.map((inv) => (
        <li key={inv.id}>
          <PendingRow invite={inv} />
        </li>
      ))}
    </ul>
  );
}

function HistoryList({ invites }: { invites: Invite[] }) {
  if (invites.length === 0) {
    return (
      <p className="text-sm text-muted">
        No past invites yet. Once you accept or decline a few they&apos;ll
        live here.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {invites.map((inv) => (
        <li key={inv.id}>
          <HistoryRow invite={inv} />
        </li>
      ))}
    </ul>
  );
}

function PendingRow({ invite }: { invite: Invite }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [decided, setDecided] = useState<"accepted" | "declined" | null>(
    null,
  );

  function decide(next: "accepted" | "declined") {
    setError(null);
    startTransition(async () => {
      const action = next === "accepted" ? approveInvite : rejectInvite;
      const result = await action(invite.id);
      if (result.status === "ok") {
        setDecided(next);
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  }

  if (decided) {
    return (
      <div className="rounded-2xl border border-bean bg-surface px-4 py-3 text-sm text-muted">
        {decided === "accepted"
          ? `Accepted — emailing your contact channels to ${invite.requesterName}.`
          : `Declined — emailing a polite note to ${invite.requesterName}.`}
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
          {timeAgo(invite.createdAt)} · {MODE_LABEL[invite.mode]}
        </p>
      </header>

      <p className="text-sm leading-[1.55] text-ink/80">
        “{invite.requesterTopic}”
      </p>

      <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <div className="flex gap-1.5">
          <dt className="text-muted">Email:</dt>
          <dd>
            <a
              href={`mailto:${invite.requesterEmail}`}
              className="text-accent hover:underline"
            >
              {invite.requesterEmail}
            </a>
          </dd>
        </div>
        {invite.preferredTime && (
          <div className="flex gap-1.5">
            <dt className="text-muted">When:</dt>
            <dd className="text-ink/80">{invite.preferredTime}</dd>
          </div>
        )}
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
          {pending ? "…" : "Accept"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => decide("declined")}
          className="inline-flex items-center gap-2 rounded-2xl border border-bean bg-surface px-4 py-2 text-sm font-medium text-ink/85 hover:border-accent/60 hover:text-accent disabled:opacity-60"
        >
          Decline
        </button>
      </div>
    </article>
  );
}

function HistoryRow({ invite }: { invite: Invite }) {
  const status =
    invite.status === "pending"
      ? STATUS_BADGE.expired // shouldn't happen — server already remapped, defensive
      : STATUS_BADGE[invite.status];
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
            status.tone === "good"
              ? "bg-accent-soft text-accent"
              : "bg-bean/60 text-ink/70"
          }`}
        >
          {status.label}
        </span>
      </header>
      <p className="text-sm leading-[1.5] text-ink/70 line-clamp-2">
        “{invite.requesterTopic}”
      </p>
      <p className="text-xs text-muted">
        {MODE_LABEL[invite.mode]} · {formatDate(decidedDate)}
      </p>
    </article>
  );
}

// Compact "5m ago" / "3h ago" / "2d ago" for pending rows — pending rows
// never live longer than the 7-day TTL so we don't need to handle weeks.
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Decided rows can live forever — render absolute date so the host can
// orient ("did I accept this last week or last month?").
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
