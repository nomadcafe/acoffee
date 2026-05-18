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

// Owner inbox for pending invites. Lives between CardSharePanel and the
// edit form on /profile. Each card shows the requester's name + email +
// topic + mode + (optional) preferred time, with Accept / Decline. Decision
// is a one-shot server action — no undo flow yet (vision §0.3 keeps the
// state machine intentionally small).
export function InviteInbox({ invites }: { invites: Invite[] }) {
  if (invites.length === 0) {
    return (
      <section className="rounded-3xl border border-bean bg-surface p-5 sm:p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          Inbox
        </p>
        <p className="mt-2 text-sm text-muted">
          No pending invites. When someone fills your invite form on{" "}
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
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          Inbox
        </p>
        <p className="text-xs text-muted">
          {invites.length} pending · 7-day TTL
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {invites.map((inv) => (
          <li key={inv.id}>
            <InviteRow invite={inv} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function InviteRow({ invite }: { invite: Invite }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // After decide, the row shows a 1-line confirmation until revalidate
  // sweeps it off — feels snappier than the row vanishing mid-transition.
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

// Compact "5m ago" / "3h ago" / "2d ago". For longer than ~30 days the
// 7-day TTL means the row would already be filtered out — we never
// render weeks-old rows.
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
