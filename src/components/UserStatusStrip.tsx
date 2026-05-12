import Link from "next/link";
import { extendIntent } from "@/app/chiang-mai/meet/actions";
import { LiveCountdown } from "@/components/LiveCountdown";
import { getMyActiveSession } from "@/lib/auth-queries";
import { INTENT_KIND_LABEL } from "@/lib/intent-labels";

// Show the "Extend" nudge when the intent is about to expire AND no one
// has responded yet. Inside this window, the user is at high risk of
// dropping out frustrated ("set intent, waited, nothing happened"); the
// affordance lets them buy more time in one tap instead of withdrawing
// and re-posting.
const EXTEND_NUDGE_THRESHOLD_MS = 30 * 60 * 1000;

export async function UserStatusStrip() {
  const session = await getMyActiveSession();
  if (!session) return null;

  // Match overrides the strip layout — it's the magic moment the product
  // exists for. Big accent pill, direct hand-off to /meet (which renders
  // the contact reveal). Checkin / intent fold into a muted secondary row
  // below so they don't steal attention.
  if (session.match) {
    return (
      <div className="sticky top-0 z-20 border-b border-accent/40 bg-accent text-page shadow-sm">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link
            href="/chiang-mai/meet"
            className="group flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-base font-medium hover:opacity-90"
          >
            <span aria-hidden>🎉</span>
            <span>
              <span className="font-semibold">
                @{session.match.otherHandle}
              </span>{" "}
              matched you for{" "}
              <span className="font-semibold">
                {INTENT_KIND_LABEL[session.match.intentKind]}
              </span>
            </span>
            <span className="font-mono text-xs uppercase tracking-widest underline-offset-4 group-hover:underline">
              Open contact →
            </span>
          </Link>
          {(session.checkin || session.intent) && (
            <p className="font-mono text-[11px] uppercase tracking-widest text-page/75 sm:text-right">
              {session.checkin
                ? `at ${session.checkin.cafeName}`
                : `open to ${INTENT_KIND_LABEL[session.intent!.kind]}`}
            </p>
          )}
        </div>
      </div>
    );
  }

  const pending = session.intent?.pendingResponseCount ?? 0;
  const intentMsLeft = session.intent
    ? new Date(session.intent.expiresAt).getTime() - Date.now()
    : Infinity;
  const showExtendNudge =
    session.intent !== null &&
    pending === 0 &&
    intentMsLeft > 0 &&
    intentMsLeft < EXTEND_NUDGE_THRESHOLD_MS;

  return (
    <div className="sticky top-0 z-20 border-b border-dashed border-accent/40 bg-accent-soft/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 text-sm sm:px-6">
        {session.checkin && (
          <Link
            href={`/chiang-mai/cafes/${session.checkin.cafeSlug}`}
            className="flex items-center gap-2 transition hover:text-accent"
          >
            <span className="relative flex h-1.5 w-1.5" aria-hidden>
              <span className="absolute inset-0 animate-ping rounded-full bg-accent/60" />
              <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            <span className="text-ink">
              At{" "}
              <span className="font-medium">{session.checkin.cafeName}</span>
            </span>
            <LiveCountdown
              expiresAt={session.checkin.expiresAt}
              className="font-mono text-xs text-muted"
            />
          </Link>
        )}

        {session.checkin && session.intent && (
          <span className="hidden text-bean sm:inline" aria-hidden>
            ·
          </span>
        )}

        {session.intent && (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/chiang-mai/meet"
              className="flex items-center gap-2 transition hover:text-accent"
            >
              <span className="text-ink">
                Open to{" "}
                <span className="font-medium">
                  {INTENT_KIND_LABEL[session.intent.kind]}
                </span>
              </span>
              {pending > 0 && (
                <span
                  className="rounded-full bg-accent px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-page"
                  aria-label={`${pending} pending response${pending === 1 ? "" : "s"}`}
                >
                  {pending} new {pending === 1 ? "reply" : "replies"}
                </span>
              )}
              <LiveCountdown
                expiresAt={session.intent.expiresAt}
                className="font-mono text-xs text-muted"
              />
            </Link>
            {showExtendNudge && (
              <form action={extendIntent}>
                <button
                  type="submit"
                  className="rounded-full border border-accent/60 bg-surface px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-accent hover:bg-accent hover:text-page"
                  title="Push your intent out by 2 hours"
                >
                  Extend +2h
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
