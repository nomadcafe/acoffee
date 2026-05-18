import type { Metadata } from "next";
import Link from "next/link";
import { emailNewInvite } from "@/lib/email";
import { getLocale } from "@/lib/i18n";
import { t, tmpl, type Locale } from "@/lib/i18n/dict";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { type InviteMode } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirm your invite",
  robots: { index: false, follow: false },
};

// Confirm-link landing for the AA2 flow: visitor clicks the link in their
// email, this page promotes the invite from `unconfirmed` to `pending` +
// fires the new-invite notification to the host. Idempotent — a second
// click renders the "already done" state instead of re-firing the host
// email.
//
// Server-side mutation on GET is technically un-RESTful, but most modern
// email clients don't prefetch unsolicited URLs and the action is
// idempotent. If we ever see accidental confirms via prefetch we'll
// switch to a button-and-form pattern.
type Outcome =
  | { kind: "success"; hostHandle: string; hostDisplayName: string }
  | { kind: "alreadyDone"; hostHandle: string; hostDisplayName: string }
  | { kind: "expired" }
  | { kind: "notFound" };

async function processConfirm(token: string): Promise<Outcome> {
  if (!token || typeof token !== "string") return { kind: "notFound" };

  const admin = createSupabaseAdmin();
  const { data: invite, error } = await admin
    .from("invites")
    .select(
      "id, host_id, requester_name, requester_email, requester_topic, mode, preferred_time, status, expires_at, requester_locale, confirmed_at",
    )
    .eq("confirm_token", token)
    .maybeSingle();
  if (error || !invite) return { kind: "notFound" };

  const hostId = invite.host_id as string;
  const { data: host } = await admin
    .from("profiles")
    .select("handle, locale")
    .eq("id", hostId)
    .maybeSingle();
  const hostHandle = (host?.handle as string | undefined) ?? "the host";
  const hostDisplayName = hostHandle
    .split("_")
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
  const hostLocaleRaw = host?.locale as string | null | undefined;
  const hostLocale: Locale =
    hostLocaleRaw === "zh" || hostLocaleRaw === "ja" ? hostLocaleRaw : "en";

  // If the visitor already clicked once, the row is in pending /
  // accepted / declined state. Don't re-fire emails; show "already done".
  if (invite.status !== "unconfirmed") {
    return { kind: "alreadyDone", hostHandle, hostDisplayName };
  }

  if (new Date(invite.expires_at as string) < new Date()) {
    return { kind: "expired" };
  }

  const { error: updateErr } = await admin
    .from("invites")
    .update({
      status: "pending",
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", invite.id as string);
  if (updateErr) {
    // Don't render "success" if the write didn't take — visitor can
    // retry the link (which will hit the `alreadyDone` branch only if
    // a parallel request already won).
    return { kind: "notFound" };
  }

  // Now the host gets the heads-up. Pull their auth email via the admin
  // API — profiles.email_contact is the *public* contact, not the
  // notification inbox.
  const { data: hostAuth } = await admin.auth.admin.getUserById(hostId);
  const hostNotifyEmail = hostAuth.user?.email ?? null;
  if (hostNotifyEmail) {
    await emailNewInvite({
      to: hostNotifyEmail,
      hostHandle,
      requesterName: invite.requester_name as string,
      requesterEmail: invite.requester_email as string,
      requesterTopic: invite.requester_topic as string,
      mode: invite.mode as InviteMode,
      preferredTime: (invite.preferred_time as string | null) ?? null,
      locale: hostLocale,
    });
  }

  return { kind: "success", hostHandle, hostDisplayName };
}

export default async function ConfirmPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [outcome, locale] = await Promise.all([
    processConfirm(token),
    getLocale(),
  ]);

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col justify-center gap-5 px-4 py-16 sm:px-6 sm:py-20">
      <Body outcome={outcome} locale={locale} />
    </main>
  );
}

function Body({ outcome, locale }: { outcome: Outcome; locale: Locale }) {
  if (outcome.kind === "success") {
    return (
      <Panel
        tone="success"
        title={t(locale, "confirm.success.title")}
        body={tmpl(t(locale, "confirm.success.body"), {
          host: outcome.hostDisplayName,
        })}
        primary={
          <Link
            href={`/${outcome.hostHandle}`}
            className="inline-flex items-center gap-2 rounded-2xl bg-accent px-5 py-3 text-base font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md"
          >
            {tmpl(t(locale, "confirm.success.viewCard"), {
              host: outcome.hostDisplayName,
            })}
            <span aria-hidden>→</span>
          </Link>
        }
        backLabel={t(locale, "confirm.backHome")}
      />
    );
  }

  if (outcome.kind === "alreadyDone") {
    return (
      <Panel
        tone="muted"
        title={t(locale, "confirm.alreadyDone.title")}
        body={tmpl(t(locale, "confirm.alreadyDone.body"), {
          host: outcome.hostDisplayName,
        })}
        backLabel={t(locale, "confirm.backHome")}
      />
    );
  }

  if (outcome.kind === "expired") {
    return (
      <Panel
        tone="muted"
        title={t(locale, "confirm.expired.title")}
        body={t(locale, "confirm.expired.body")}
        backLabel={t(locale, "confirm.backHome")}
      />
    );
  }

  return (
    <Panel
      tone="muted"
      title={t(locale, "confirm.notFound.title")}
      body={t(locale, "confirm.notFound.body")}
      backLabel={t(locale, "confirm.backHome")}
    />
  );
}

function Panel({
  tone,
  title,
  body,
  primary,
  backLabel,
}: {
  tone: "success" | "muted";
  title: string;
  body: string;
  primary?: React.ReactNode;
  backLabel: string;
}) {
  return (
    <section
      className={`flex flex-col gap-4 rounded-3xl border p-6 sm:p-8 ${
        tone === "success"
          ? "border-accent/40 bg-accent-soft/60"
          : "border-bean bg-surface"
      }`}
    >
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        {title}
      </h1>
      <p className="text-base leading-[1.55] text-ink/80">{body}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {primary}
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-2xl border border-bean bg-surface px-4 py-2.5 text-sm font-medium text-ink/85 hover:border-accent/60 hover:text-accent"
        >
          {backLabel}
        </Link>
      </div>
    </section>
  );
}
