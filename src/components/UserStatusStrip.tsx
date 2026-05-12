import Link from "next/link";
import { LiveCountdown } from "@/components/LiveCountdown";
import { getMyActiveSession } from "@/lib/auth-queries";
import { INTENT_KIND_LABEL } from "@/lib/intent-labels";

export async function UserStatusStrip() {
  const session = await getMyActiveSession();
  if (!session) return null;

  return (
    <div className="sticky top-0 z-20 border-b border-dashed border-accent/40 bg-accent-soft/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 text-sm sm:px-6">
        {session.match && (
          <Link
            href="/chiang-mai/meet"
            className="flex items-center gap-2 transition hover:text-accent"
          >
            <span className="font-mono text-xs font-semibold text-accent">
              ✓ Matched
            </span>
            <span className="text-ink">
              with{" "}
              <span className="font-medium">@{session.match.otherHandle}</span>{" "}
              ·{" "}
              <span className="font-medium">
                {INTENT_KIND_LABEL[session.match.intentKind]}
              </span>
            </span>
            <span className="font-mono text-xs text-muted">
              see contact →
            </span>
          </Link>
        )}

        {session.match && (session.checkin || session.intent) && (
          <span className="hidden text-bean sm:inline" aria-hidden>
            ·
          </span>
        )}

        {session.checkin && (
          <Link
            href={`/chiang-mai/cafes/${session.checkin.cafeSlug}`}
            className="flex items-center gap-2 transition hover:text-accent"
          >
            <span
              className="relative flex h-1.5 w-1.5"
              aria-hidden
            >
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
            <LiveCountdown
              expiresAt={session.intent.expiresAt}
              className="font-mono text-xs text-muted"
            />
          </Link>
        )}
      </div>
    </div>
  );
}
