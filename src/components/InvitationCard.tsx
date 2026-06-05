import { KIND_EMOJI } from "@/components/CardBody";
import { t, tmpl, type Locale } from "@/lib/i18n/dict";
import type { InviteLinkData } from "@/lib/invite-link";

// The rendered coffee invitation — what the recipient sees when they open a
// shared /invite?from=…&with=… link, and what the generator shows as a live
// preview. Presentational and pure (locale passed in), so the server landing
// page and the client generator can both render it. Mirrors <CardBody>'s
// surface (rounded gradient panel, serif 'a' watermark, accent palette) so
// the invitation reads as the same product as a real card.
//
// `headingAs` keeps the document outline correct: the landing page makes
// this its primary <h1>; the generator preview sits under the generator's
// own <h1>, so it passes "p" to avoid a second top-level heading.
export function InvitationCard({
  data,
  locale,
  headingAs = "p",
  cta,
}: {
  data: InviteLinkData;
  locale: Locale;
  headingAs?: "h1" | "p";
  cta?: React.ReactNode;
}) {
  const Heading = headingAs;
  const headline = data.from
    ? tmpl(t(locale, "inviteLink.card.headlineFrom"), { from: data.from })
    : t(locale, "inviteLink.card.headlineAnon");

  return (
    <article className="relative isolate flex flex-col gap-5 overflow-hidden rounded-3xl border border-bean bg-gradient-to-br from-surface via-surface to-accent-soft/35 p-6 shadow-[0_24px_48px_-30px_rgba(42,31,24,0.3)] sm:p-7">
      <span
        aria-hidden
        className="pointer-events-none absolute -right-4 -top-8 select-none font-serif text-[9rem] font-medium italic leading-none text-accent/[0.07]"
      >
        a
      </span>

      <header className="relative flex items-center justify-between gap-3 text-xs font-medium text-muted">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
          />
          <span className="truncate">acoffee.com</span>
        </span>
        <span className="shrink-0 text-accent">
          {t(locale, "inviteLink.card.badge")}
        </span>
      </header>

      {data.to && (
        <p className="relative text-sm font-medium text-muted">
          {tmpl(t(locale, "inviteLink.card.greeting"), { name: data.to })}
        </p>
      )}

      <Heading className="relative text-2xl font-semibold leading-tight tracking-tight text-ink sm:text-3xl">
        <span aria-hidden>☕ </span>
        {headline}
      </Heading>

      {(data.city || data.kind) && (
        <div className="relative flex flex-wrap items-center gap-2 text-sm text-muted">
          {data.city && <span>📍 {data.city}</span>}
          {data.city && data.kind && (
            <span aria-hidden className="text-bean">
              ·
            </span>
          )}
          {data.kind && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/15 bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
              <span aria-hidden>{KIND_EMOJI[data.kind]}</span>
              {t(locale, `profile.kind.${data.kind}` as const)}
            </span>
          )}
        </div>
      )}

      {data.topic && (
        <p className="relative font-serif text-lg italic leading-[1.5] text-ink/85 sm:text-xl">
          “{data.topic}”
        </p>
      )}

      {cta && (
        <div className="relative mt-1 border-t border-bean/70 pt-4">{cta}</div>
      )}
    </article>
  );
}
