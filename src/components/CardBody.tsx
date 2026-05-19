import { Avatar } from "./Avatar";
import { SocialIcon } from "./icons/SocialIcons";
import { PLATFORMS } from "@/lib/socials";
import type { CoffeeChatKind, Gender, SocialLink } from "@/lib/types";

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
  // v0.9 — gender soft signal beside the city/locator line. null =
  // "prefer not to say" so we render nothing.
  gender?: Gender | null;
  // v0.10 — dynamic socials, bio.link style. Empty array hides the
  // row entirely; otherwise renders one icon-anchor per entry.
  socialLinks?: SocialLink[];
  avatarUrl?: string | null;
  badge?: React.ReactNode;
  footer: React.ReactNode;
};

const GENDER_LABEL: Record<Gender, string> = {
  woman: "♀ woman",
  man: "♂ man",
};

export function CardBody({
  handle,
  displayName,
  city,
  locator,
  status,
  kinds,
  gender,
  socialLinks,
  avatarUrl,
  badge,
  footer,
}: CardBodyProps) {
  const metaParts = [city, locator, gender ? GENDER_LABEL[gender] : null].filter(
    Boolean,
  );
  // Compose the public URL + tooltip per link using the central
  // platform registry, then render below the chat-kind chips. Skip
  // any malformed row defensively so a stale jsonb can't break paint.
  const socials = (socialLinks ?? []).flatMap((link, i) => {
    const meta = PLATFORMS[link.platform];
    if (!meta) return [];
    return [
      {
        key: `${link.platform}-${i}`,
        platform: link.platform,
        href: meta.urlFor(link.value),
        title: `${meta.label} · ${meta.displayLabel(link.value)}`,
      },
    ];
  });
  return (
    <article className="relative isolate flex flex-col gap-5 overflow-hidden rounded-3xl border border-bean bg-gradient-to-br from-surface via-surface to-accent-soft/35 p-6 shadow-[0_24px_48px_-30px_rgba(42,31,24,0.3)] sm:p-7">
      {/* Decorative serif 'a' watermark — connects back to the aCoffee
          wordmark, sits at very low opacity in the top-right corner.
          pointer-events-none + select-none + aria-hidden so it's purely
          visual. Sized large so it bleeds off the card edge for a
          deliberately oversized-monogram feel. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-4 -top-8 select-none font-serif text-[9rem] font-medium italic leading-none text-accent/[0.07]"
      >
        a
      </span>

      <header className="relative flex items-center justify-between gap-3">
        <p className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted">
          {/* Small pulse dot signals 'live card' without re-using the
              big floating chip the SampleCard hero adds outside. Always
              on (no animation) — cheap visual anchor. */}
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
          />
          <span className="truncate">acoffee.com/{handle}</span>
        </p>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </header>

      <div className="relative flex items-center gap-4">
        <Avatar
          handle={handle}
          displayName={displayName}
          src={avatarUrl}
          size="md"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-[2rem]">
              {displayName}
            </h1>
            <span className="text-sm font-medium text-muted">
              @{handle}
            </span>
          </div>
          {metaParts.length > 0 && (
            <p className="text-sm text-muted">{metaParts.join(" · ")}</p>
          )}
        </div>
      </div>

      {status ? (
        // Status in Fraunces serif italic — gives the card a 'voice'
        // pull-quote feel without the rest of the surface going
        // editorial. Same font the wordmark uses, so it reads as a
        // brand accent, not a one-off type swap.
        <p className="relative font-serif text-lg italic leading-[1.5] text-ink/85 sm:text-xl">
          {status}
        </p>
      ) : (
        <p className="relative text-sm text-muted">No status yet.</p>
      )}

      {kinds.length > 0 && (
        <div className="relative flex flex-wrap gap-2">
          {kinds.map((k) => {
            const m = KIND_META[k];
            return (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 rounded-full border border-accent/15 bg-accent-soft px-3 py-1 text-xs font-medium text-accent"
              >
                <span aria-hidden>{m.emoji}</span>
                {m.label}
              </span>
            );
          })}
        </div>
      )}

      {socials.length > 0 && (
        <div className="relative flex flex-wrap items-center gap-2">
          {socials.map((s) => (
            <a
              key={s.key}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer me"
              aria-label={s.title}
              title={s.title}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-bean bg-surface text-ink/70 transition-colors hover:border-accent/60 hover:bg-accent-soft hover:text-accent"
            >
              <SocialIcon platform={s.platform} />
            </a>
          ))}
        </div>
      )}

      <div className="relative mt-1 border-t border-bean/70 pt-4">{footer}</div>
    </article>
  );
}
