import { Avatar } from "./Avatar";
import type { CoffeeChatKind, Gender } from "@/lib/types";

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
  // v0.9 — public socials + gender. Socials are public discovery links
  // (already findable elsewhere); they render as a small icon row under
  // the kind chips. Gender renders inline beside the city/locator line
  // as a soft signal — null = "prefer not to say" = not rendered.
  gender?: Gender | null;
  xHandle?: string | null;
  instagramHandle?: string | null;
  githubHandle?: string | null;
  websiteUrl?: string | null;
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
  xHandle,
  instagramHandle,
  githubHandle,
  websiteUrl,
  avatarUrl,
  badge,
  footer,
}: CardBodyProps) {
  const metaParts = [city, locator, gender ? GENDER_LABEL[gender] : null].filter(
    Boolean,
  );
  const socials: Array<{ key: string; href: string; label: string; node: React.ReactNode }> = [];
  if (xHandle) {
    socials.push({
      key: "x",
      href: `https://x.com/${xHandle}`,
      label: `@${xHandle} on X`,
      node: <XIcon />,
    });
  }
  if (instagramHandle) {
    socials.push({
      key: "ig",
      href: `https://instagram.com/${instagramHandle}`,
      label: `@${instagramHandle} on Instagram`,
      node: <InstagramIcon />,
    });
  }
  if (githubHandle) {
    socials.push({
      key: "gh",
      href: `https://github.com/${githubHandle}`,
      label: `@${githubHandle} on GitHub`,
      node: <GitHubIcon />,
    });
  }
  if (websiteUrl) {
    socials.push({
      key: "web",
      href: websiteUrl,
      label: websiteUrl.replace(/^https?:\/\//, ""),
      node: <GlobeIcon />,
    });
  }
  return (
    <article className="relative flex flex-col gap-5 rounded-3xl border border-bean bg-surface p-6 shadow-[0_24px_48px_-30px_rgba(42,31,24,0.3)] sm:p-7">
      <header className="flex items-center justify-between gap-3">
        <p className="truncate text-xs font-medium text-muted">
          acoffee.com/{handle}
        </p>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </header>

      <div className="flex items-center gap-4">
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

      {socials.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {socials.map((s) => (
            <a
              key={s.key}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer me"
              aria-label={s.label}
              title={s.label}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-bean bg-surface text-ink/70 transition-colors hover:border-accent/60 hover:bg-accent-soft hover:text-accent"
            >
              {s.node}
            </a>
          ))}
        </div>
      )}

      <div className="mt-1 border-t border-bean/70 pt-4">{footer}</div>
    </article>
  );
}

// Inline brand SVGs so we don't pull in a 20kb icon package for four
// glyphs. Sized via `currentColor` so the hover-tint on the anchor
// flows through. Paths are simplified outline renditions, not exact
// brand marks — good enough at 18px.
function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.658l-5.214-6.817-5.967 6.817H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.11.79-.25.79-.56v-2c-3.21.7-3.88-1.36-3.88-1.36-.53-1.35-1.3-1.71-1.3-1.71-1.06-.73.08-.71.08-.71 1.17.08 1.79 1.21 1.79 1.21 1.04 1.78 2.73 1.27 3.4.97.1-.75.41-1.27.74-1.56-2.56-.29-5.26-1.28-5.26-5.7 0-1.26.45-2.29 1.2-3.1-.12-.29-.52-1.47.11-3.06 0 0 .98-.31 3.2 1.18a11 11 0 0 1 5.83 0c2.22-1.49 3.2-1.18 3.2-1.18.63 1.59.23 2.77.11 3.06.75.81 1.2 1.84 1.2 3.1 0 4.43-2.7 5.4-5.27 5.69.42.36.79 1.07.79 2.16v3.2c0 .31.21.68.79.56A11.5 11.5 0 0 0 12 .5z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}
