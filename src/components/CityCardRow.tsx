import Link from "next/link";
import { Avatar } from "./Avatar";
import { KIND_EMOJI } from "./CardBody";
import { formatCityUntil } from "@/lib/city";
import { t, tmpl, type Locale } from "@/lib/i18n/dict";
import type { CityCard } from "@/lib/auth-queries";

// One compact row on a /city/[slug] page. Links to the full card, where
// the invite lives — the list itself never exposes contacts or a form.
// A future city_until shows as a "until {date}" pill so the nomads who
// are only passing through read as more urgent than the residents.
export function CityCardRow({
  card,
  locale,
}: {
  card: CityCard;
  locale: Locale;
}) {
  return (
    <Link
      href={`/${card.handle}`}
      className="flex items-start gap-4 rounded-2xl border border-bean bg-surface p-4 transition-colors hover:border-accent/60 hover:bg-accent-soft/30"
    >
      <Avatar
        handle={card.handle}
        displayName={card.displayName}
        src={card.avatarUrl}
        size="sm"
      />
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-semibold tracking-tight text-ink">
            {card.displayName}
          </span>
          <span className="text-xs font-medium text-muted">
            @{card.handle}
          </span>
          {card.cityUntil && (
            <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent-soft/60 px-2 py-0.5 text-xs font-medium text-accent">
              <span aria-hidden>📍</span>
              {tmpl(t(locale, "city.row.until"), {
                date: formatCityUntil(card.cityUntil, locale),
              })}
            </span>
          )}
        </div>
        {card.status && (
          <p className="line-clamp-2 text-sm leading-[1.5] text-ink/80">
            {card.status}
          </p>
        )}
        {card.coffeeChatKinds.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {card.coffeeChatKinds.map((k) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 rounded-full border border-accent/15 bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent"
              >
                <span aria-hidden>{KIND_EMOJI[k]}</span>
                {t(locale, `profile.kind.${k}` as const)}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
