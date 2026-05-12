import type { Metadata } from "next";
import Link from "next/link";
import { LiveCountdown } from "@/components/LiveCountdown";
import {
  getMyIntentView,
  getSessionUser,
  listOtherActiveIntentsView,
  type MyIntentView,
  type OtherIntentView,
} from "@/lib/auth-queries";
import { INTENT_KIND_LABEL, INTENT_KIND_ORDER } from "@/lib/intent-labels";
import type { ContactReveal } from "@/lib/types";
import {
  acceptResponse,
  clearIntent,
  declineResponse,
  respondToIntent,
  setIntent,
} from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Meet in Chiang Mai",
  description:
    "Open for coffee, cowork, or dinner in Chiang Mai. Send one signal, get matched.",
  alternates: { canonical: "/chiang-mai/meet" },
  robots: { index: false, follow: false },
};

const KIND_LABEL = INTENT_KIND_LABEL;


export default async function MeetPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return <SignInGate />;

  const [myIntent, otherIntents] = await Promise.all([
    getMyIntentView(),
    listOtherActiveIntentsView("chiang-mai"),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">
          Chiang Mai · Meet
        </p>
        <h1 className="font-display text-5xl font-medium leading-[1.05] sm:text-6xl">
          Meet for coffee, cowork, or dinner.
        </h1>
        <p className="text-base text-muted sm:text-lg">
          Pick one. Active 4–12 hours. One match per intent — no chat, no
          swiping. Everyone open across Chiang Mai is here; the in-café
          roster is your same-room shortcut.
        </p>
      </header>

      {myIntent ? <MyIntentBlock view={myIntent} /> : <SetIntentForm />}

      <section className="flex flex-col gap-4 border-t border-dashed border-bean pt-6">
        <h2 className="flex items-baseline gap-3 font-serif text-2xl font-medium">
          Open in Chiang Mai right now
          <span className="font-mono text-sm font-normal text-muted">
            {otherIntents.length}
          </span>
        </h2>
        {otherIntents.length === 0 ? (
          <p className="text-sm text-muted">
            No one&apos;s open right now. Set your own intent above and check
            back in an hour.
          </p>
        ) : (
          <div className="flex flex-col">
            {otherIntents.map((view) => (
              <OtherIntentCard key={view.intent.id} view={view} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function SignInGate() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-14 sm:py-20">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">
          Chiang Mai · Meet
        </p>
        <h1 className="font-display text-4xl font-medium leading-[1.05] sm:text-5xl">
          Sign in to meet nomads in Chiang Mai.
        </h1>
        <p className="text-base text-muted">
          See who&apos;s open for coffee, cowork, or dinner. One tap, no
          password.
        </p>
      </header>
      <Link
        href="/auth/signin?next=/chiang-mai/meet"
        className="self-start rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-page hover:bg-accent-hover"
      >
        Sign in →
      </Link>
    </main>
  );
}

function SetIntentForm() {
  return (
    <section className="flex flex-col gap-4 border-t border-dashed border-bean pt-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-serif text-2xl font-medium">
          What are you open to today?
        </h2>
        <p className="text-sm text-muted">
          Pick one. Coffee &amp; cowork stay open 4h; dinner anchors to tonight
          (10pm local); hike anchors to today (11pm local).
        </p>
        <p className="text-xs text-muted/80">
          <span aria-hidden>💡</span> Stronger signal: check in at a café first.
          Responders see «working at X right now» on your intent and reply
          faster.{" "}
          <Link
            href="/chiang-mai/cafes"
            className="font-medium text-accent underline-offset-4 hover:underline"
          >
            Pick a café →
          </Link>
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {INTENT_KIND_ORDER.map((kind) => (
          <form key={kind} action={setIntent}>
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="city" value="chiang-mai" />
            <button
              type="submit"
              className="rounded-full border border-bean bg-surface px-5 py-2.5 text-sm font-medium text-ink/85 hover:border-accent/60 hover:text-accent"
            >
              {KIND_LABEL[kind]}
            </button>
          </form>
        ))}
      </div>
    </section>
  );
}

function MyIntentBlock({ view }: { view: MyIntentView }) {
  const { intent, incomingResponses } = view;
  const pending = incomingResponses.filter((r) => r.status === "pending");
  const accepted = incomingResponses.find((r) => r.status === "accepted");

  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-accent-soft p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-serif text-2xl font-medium text-ink">
          You&apos;re open to {KIND_LABEL[intent.kind]}
        </h2>
        <LiveCountdown
          expiresAt={intent.expiresAt}
          className="rounded-full border border-accent/40 px-2.5 py-0.5 font-mono text-xs font-medium text-accent"
        />
      </div>

      {accepted ? (
        <div className="rounded-xl bg-surface p-4">
          <p className="text-sm font-medium text-ink">
            ✓ Matched with @{accepted.responderHandle}
          </p>
          <MatchContact contact={accepted.responderContact} />
        </div>
      ) : pending.length === 0 ? (
        <p className="text-sm text-muted">
          No responses yet. Hold tight, or check back in an hour.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-widest text-accent">
            {pending.length} {pending.length === 1 ? "response" : "responses"}
          </p>
          {pending.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface p-3"
            >
              <span className="text-sm font-medium">@{r.responderHandle}</span>
              <div className="flex gap-2">
                <form action={acceptResponse}>
                  <input type="hidden" name="responseId" value={r.id} />
                  <input type="hidden" name="intentId" value={intent.id} />
                  <button
                    type="submit"
                    className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-page hover:bg-accent-hover"
                  >
                    Accept
                  </button>
                </form>
                <form action={declineResponse}>
                  <input type="hidden" name="responseId" value={r.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-bean px-3 py-1 text-xs font-medium text-ink/85 hover:bg-bean/40"
                  >
                    Decline
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      <form action={clearIntent} className="self-start">
        <button
          type="submit"
          className="rounded-full border border-bean bg-surface px-4 py-2 text-sm font-medium text-ink/85 hover:bg-bean/40"
        >
          End intent
        </button>
      </form>
    </section>
  );
}

function OtherIntentCard({ view }: { view: OtherIntentView }) {
  const { intent, ownerHandle, ownerCheckin, ownerContact, myResponse } = view;

  return (
    <article className="flex flex-col gap-3 border-b border-dashed border-bean py-5 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <p className="font-serif text-lg font-medium">
            {KIND_LABEL[intent.kind]}
          </p>
          <p className="font-mono text-xs uppercase tracking-wider text-muted">
            @{ownerHandle}
          </p>
        </div>
        <LiveCountdown
          expiresAt={intent.expiresAt}
          className="rounded-full border border-accent/40 px-2.5 py-0.5 font-mono text-xs font-medium text-accent"
        />
      </div>

      {ownerCheckin && (
        <p className="font-mono text-[11px] text-accent">
          <span aria-hidden>📍</span> working at{" "}
          <Link
            href={`/chiang-mai/cafes/${ownerCheckin.cafeSlug}`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {ownerCheckin.cafeName}
          </Link>{" "}
          right now
        </p>
      )}

      {myResponse?.status === "accepted" ? (
        <div className="rounded-xl bg-accent-soft p-3">
          <p className="text-sm font-medium text-ink">✓ Matched</p>
          <MatchContact contact={ownerContact} />
        </div>
      ) : myResponse?.status === "pending" ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-muted">
            Responded · pending
          </span>
          <form action={declineResponse}>
            <input type="hidden" name="responseId" value={myResponse.id} />
            <button
              type="submit"
              className="rounded-full border border-bean px-3 py-1 text-xs font-medium text-ink/85 hover:bg-bean/40"
            >
              Withdraw
            </button>
          </form>
        </div>
      ) : myResponse?.status === "declined" ? (
        <p className="font-mono text-xs uppercase tracking-wider text-muted">
          Declined.
        </p>
      ) : (
        <form action={respondToIntent} className="self-start">
          <input type="hidden" name="intentId" value={intent.id} />
          <button
            type="submit"
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-page hover:bg-accent-hover"
          >
            I&apos;m in
          </button>
        </form>
      )}
    </article>
  );
}

// Render contact channels in priority order: Telegram → WhatsApp → email.
// Vision §4 wants the hand-off to land on a real messenger, not buried email.
function MatchContact({ contact }: { contact: ContactReveal | null }) {
  if (!contact) {
    return (
      <p className="mt-2 font-mono text-xs uppercase tracking-wider text-muted">
        Revealing contact — refresh in a moment.
      </p>
    );
  }

  const channels: { label: string; href: string; display: string }[] = [];
  if (contact.telegramHandle) {
    const h = contact.telegramHandle.replace(/^@/, "");
    channels.push({
      label: "Telegram",
      href: `https://t.me/${h}`,
      display: `@${h}`,
    });
  }
  if (contact.whatsappNumber) {
    const digits = contact.whatsappNumber.replace(/[^\d]/g, "");
    channels.push({
      label: "WhatsApp",
      href: `https://wa.me/${digits}`,
      display: contact.whatsappNumber,
    });
  }
  if (contact.email) {
    channels.push({
      label: "Email",
      href: `mailto:${contact.email}`,
      display: contact.email,
    });
  }

  if (channels.length === 0) {
    return (
      <p className="mt-2 text-sm text-muted">
        They haven&apos;t shared a contact yet — nudge them on the next refresh.
      </p>
    );
  }

  return (
    <ul className="mt-2 flex flex-col gap-1">
      {channels.map((c) => (
        <li key={c.label} className="text-sm">
          <span className="font-mono text-xs uppercase tracking-wider text-muted">
            {c.label}
          </span>{" "}
          <a
            href={c.href}
            target={c.label === "Email" ? undefined : "_blank"}
            rel={c.label === "Email" ? undefined : "noreferrer"}
            className="font-medium text-accent underline-offset-4 hover:underline"
          >
            {c.display}
          </a>
        </li>
      ))}
    </ul>
  );
}
