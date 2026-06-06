import Link from "next/link";
import { CardBody } from "./CardBody";
import { t, type Locale } from "@/lib/i18n/dict";
import type { CoffeeChatKind, SocialLink } from "@/lib/types";

// Magazine-style preview of an acoffee card, used in the home hero so a
// visitor sees "what they're about to make" without clicking signup. Backed
// by <CardBody> so the layout stays in sync with the real `/[handle]` page.
// Deliberately a *full* card — chat kinds, interest tags, and social links
// all populated — so the hero shows the card's real depth rather than a
// stripped-down skeleton.
//
// Hard-coded persona for now. When card discovery (rotating featured cards)
// lands, this becomes a server component that fetches one curated row.
export type SampleCardData = {
  handle: string;
  displayName: string;
  city: string;
  landed: string;
  status: string;
  kinds: CoffeeChatKind[];
  // v13 interest tags + v0.10 socials — populated so the preview mirrors a
  // filled-in card, not the bare minimum.
  interests: string[];
  socialLinks: SocialLink[];
};

const DEFAULT_SAMPLE: SampleCardData = {
  handle: "mia",
  displayName: "Mia",
  city: "Chiang Mai",
  landed: "landed Mon",
  status:
    "Designing a stationery brand from a Nimman café. Up for coffee chats this week — especially with other indie makers.",
  kinds: ["coffee", "cowork", "hike"],
  interests: ["design", "stationery", "indie-hacking"],
  // Generic, non-personal links for the sample so the preview never points
  // at a real (or squattable) account. Both are username fields with empty
  // values, so they compose to the bare platform URL — no real handle.
  socialLinks: [
    { platform: "instagram", value: "" },
    { platform: "threads", value: "" },
  ],
};

export function SampleCard({
  data = DEFAULT_SAMPLE,
  ctaHref = "/auth/signin?next=%2Fprofile%3Fonboarding%3D1",
  locale,
}: {
  data?: SampleCardData;
  ctaHref?: string;
  // Required so the badge / footer / CTA strings on the hero card
  // render in the right language. Home page passes its resolved
  // locale through.
  locale: Locale;
}) {
  return (
    <div className="group relative isolate">
      {/* Ambient warm glows behind the card. Two large blurred circles
          in offset tones give the hero composition depth so the card
          looks like it's floating above ambient light, not sitting on
          a flat page. -z-10 keeps them firmly behind the card. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-8 -inset-y-10 -z-10"
      >
        <div className="absolute left-1/3 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-accent/25 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 translate-x-1/4 translate-y-1/4 rounded-full bg-[#b5563a]/20 blur-3xl" />
      </div>

      {/* Floating 'Live preview' chip, pinned just outside the card's
          top-left. Pulsing dot signals motion without animating the card
          itself. Hidden on small screens to keep mobile hero tight. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-2 -top-2 z-10 hidden items-center gap-1.5 rounded-full border border-bean bg-page px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-accent shadow-sm sm:inline-flex"
      >
        <span className="relative inline-flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-accent/60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
        </span>
        {t(locale, "sample.live")}
      </div>

      {/* Card with a slight idle tilt on lg+ so the hero has visual
          rhythm. Straightens + lifts on hover for interactivity; the
          group hover is on the outer wrapper so the chip stays planted
          while the card moves. */}
      <div className="transform-gpu transition-all duration-500 ease-out lg:rotate-[1.25deg] lg:group-hover:-translate-y-1 lg:group-hover:rotate-0">
        <CardBody
          handle={data.handle}
          displayName={data.displayName}
          city={data.city}
          locator={data.landed}
          status={data.status}
          kinds={data.kinds}
          interests={data.interests}
          socialLinks={data.socialLinks}
          badge={
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[10px] font-medium text-accent">
              {t(locale, "sample.badge")}
            </span>
          }
          footer={
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted">
                {t(locale, "sample.contactUnlock")}
              </p>
              <Link
                href={ctaHref}
                className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md"
              >
                {t(locale, "invite.gate.cta")}
                <span aria-hidden>→</span>
              </Link>
            </div>
          }
          locale={locale}
        />
      </div>
    </div>
  );
}
