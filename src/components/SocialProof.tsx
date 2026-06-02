import { type Locale, t, tmpl } from "@/lib/i18n/dict";

// Floor below which the count stays hidden. A single-digit "Join 3
// people" reads colder than no line at all, so the proof only appears
// once there's a real lineup behind it — then it surfaces on its own as
// signups accrue, no code change needed. Tune this one number to taste.
export const MIN_CARDS_FOR_PROOF = 8;

// Home-page social proof: a count of live cards rendered as one quiet
// line under the hero CTA. Replaces the v0.10 LatestCardsStrip tiles —
// a number scales gracefully from a handful to thousands, where a tile
// strip looks sparse until there are enough cards to fill the row.
//
// Above 10 the count rounds down to the nearest ten and gains a "+"
// ("34" → "30+") — friendlier to read and it won't visibly tick on every
// single signup. Below that it shows the exact figure.
export function SocialProof({
  count,
  locale,
}: {
  count: number;
  locale: Locale;
}) {
  if (count < MIN_CARDS_FOR_PROOF) return null;
  const display = count >= 10 ? `${Math.floor(count / 10) * 10}+` : `${count}`;
  return (
    <p className="mt-1 flex items-center gap-2 text-sm text-muted">
      <span aria-hidden className="text-base">
        ☕
      </span>
      {tmpl(t(locale, "home.proof"), { count: display })}
    </p>
  );
}
