import Link from "next/link";
import { CardBody } from "./CardBody";
import type { CoffeeChatKind } from "@/lib/types";

// Magazine-style preview of an acoffee card, used in the home hero so a
// visitor sees "what they're about to make" without clicking signup. Backed
// by <CardBody> so the layout stays in sync with the real `/[handle]` page.
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
};

const DEFAULT_SAMPLE: SampleCardData = {
  handle: "mia",
  displayName: "Mia",
  city: "Chiang Mai",
  landed: "landed Mon",
  status:
    "Designing a stationery brand from a Nimman café. Up for coffee chats this week — especially with other indie makers.",
  kinds: ["coffee", "cowork", "hike"],
};

export function SampleCard({
  data = DEFAULT_SAMPLE,
  ctaHref = "/auth/signin?next=%2Fprofile%3Fonboarding%3D1",
}: {
  data?: SampleCardData;
  ctaHref?: string;
}) {
  return (
    <CardBody
      handle={data.handle}
      displayName={data.displayName}
      city={data.city}
      locator={data.landed}
      status={data.status}
      kinds={data.kinds}
      badge={
        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[10px] font-medium text-accent">
          Sample
        </span>
      }
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">Contact unlocks on invite</p>
          <Link
            href={ctaHref}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md"
          >
            Invite for coffee
            <span aria-hidden>→</span>
          </Link>
        </div>
      }
    />
  );
}
