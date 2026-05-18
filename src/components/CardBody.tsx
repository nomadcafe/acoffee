import { Avatar } from "./Avatar";
import type { CoffeeChatKind } from "@/lib/types";

// CardBody is the shared visual primitive used by both <SampleCard/> on the
// landing page (mock data) and the public `/[handle]` page (real data). The
// only thing that varies between those two surfaces is the masthead badge
// ("Sample card" vs nothing) and the CTA in the footer ("Invite for coffee"
// triggers signup on the landing card, expands contact options on the real
// card). Both are passed in as ReactNodes so this file stays presentational.

export const KIND_META: Record<
  CoffeeChatKind,
  { emoji: string; label: string }
> = {
  coffee: { emoji: "☕", label: "Coffee" },
  cowork: { emoji: "💻", label: "Cowork" },
  dinner: { emoji: "🍜", label: "Dinner" },
  hike: { emoji: "🥾", label: "Hike" },
  work_talk: { emoji: "💼", label: "Work talk" },
};

export type CardBodyProps = {
  handle: string;
  displayName: string;
  city: string | null;
  // A short, magazine-style locator line under the name. Sample card shows
  // "landed Mon"; real card may show "Joined May 2026" or similar. Optional
  // — pass null to hide the row.
  locator: string | null;
  status: string | null;
  kinds: CoffeeChatKind[];
  badge?: React.ReactNode;
  footer: React.ReactNode;
};

export function CardBody({
  handle,
  displayName,
  city,
  locator,
  status,
  kinds,
  badge,
  footer,
}: CardBodyProps) {
  return (
    <article className="relative flex flex-col gap-5 rounded-3xl border border-bean bg-surface p-6 shadow-[0_24px_48px_-30px_rgba(42,31,24,0.3)] sm:p-7">
      <header className="flex items-center justify-between gap-3">
        <p className="truncate text-xs font-medium text-muted">
          acoffee.com/{handle}
        </p>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </header>

      <div className="flex items-center gap-4">
        <Avatar handle={handle} displayName={displayName} size="md" />
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-[2rem]">
              {displayName}
            </h1>
            <span className="text-sm font-medium text-muted">
              @{handle}
            </span>
          </div>
          {(city || locator) && (
            <p className="text-sm text-muted">
              {[city, locator].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>

      {status ? (
        <p className="text-base leading-[1.55] text-ink/80 sm:text-lg">
          {status}
        </p>
      ) : (
        <p className="text-sm text-muted">No status yet.</p>
      )}

      {kinds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {kinds.map((k) => {
            const m = KIND_META[k];
            return (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent"
              >
                <span aria-hidden>{m.emoji}</span>
                {m.label}
              </span>
            );
          })}
        </div>
      )}

      <div className="mt-1 border-t border-bean/70 pt-4">{footer}</div>
    </article>
  );
}
