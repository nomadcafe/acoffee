import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CafeMap } from "@/components/CafeMap";
import { LiveCountdown } from "@/components/LiveCountdown";
import { LiveTimeSince } from "@/components/LiveTimeSince";
import { RefreshAt } from "@/components/RefreshAt";
import { ShareCheckin } from "@/components/ShareCheckin";
import {
  getMyActiveCheckinAtCafe,
  getMyActiveSession,
  getRosterAtCafe,
  getSessionUser,
  type RosterEntry,
} from "@/lib/auth-queries";
import { INTENT_KIND_LABEL, INTENT_KIND_ORDER } from "@/lib/intent-labels";
import { siteUrl } from "@/lib/site";
import {
  countActiveCheckins,
  countActiveIntents,
  countCheckinsLastWeek,
  getCafeBySlug,
  listActiveCheckinCounts,
  listCafesNear,
} from "@/lib/store";
import type { Cafe, Checkin, IntentKind } from "@/lib/types";
import {
  acceptResponse,
  clearIntent,
  declineResponse,
  respondToIntent,
  setIntent,
} from "../../meet/actions";
import { checkIn, checkOut, extendCheckin } from "./actions";

export const dynamic = "force-dynamic";

type RouteParams = { slug: string };

function tagSummary(cafe: Cafe): string {
  const parts: string[] = [];
  if (cafe.hasWifi) parts.push("Wi-Fi");
  if (cafe.hasOutlets) parts.push("outlets");
  if (cafe.laptopFriendly) parts.push("room to stay");
  return parts.length ? ` Features: ${parts.join(", ")}.` : "";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cafe = await getCafeBySlug(slug);
  if (!cafe) return { title: "Café not found" };
  const title = cafe.neighborhood
    ? `${cafe.name} · ${cafe.neighborhood}`
    : cafe.name;
  const description = `${cafe.name} — a café in ${
    cafe.neighborhood ?? "Chiang Mai"
  }, Chiang Mai.${tagSummary(cafe)}`;
  const path = `/chiang-mai/cafes/${cafe.slug}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} · acoffee`,
      description,
      url: path,
    },
  };
}

export default async function CafeDetailPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;
  const cafe = await getCafeBySlug(slug);
  if (!cafe) notFound();

  const [
    activeCount,
    myCheckin,
    sessionUser,
    mySession,
    roster,
    nearbyRaw,
    weeklyCheckins,
    openIntentsInCity,
  ] = await Promise.all([
    countActiveCheckins(cafe.id),
    getMyActiveCheckinAtCafe(cafe.id),
    getSessionUser(),
    getMyActiveSession(),
    getRosterAtCafe(cafe.id),
    listCafesNear({
      lat: cafe.lat,
      lng: cafe.lng,
      radiusKm: 0.5,
      city: cafe.city,
      limit: 7,
    }),
    countCheckinsLastWeek(cafe.id),
    countActiveIntents(cafe.city),
  ]);
  const myIntent = mySession?.intent ?? null;
  const nearbyCafes = nearbyRaw.filter((c) => c.id !== cafe.id);
  const nearbyActiveCounts = await listActiveCheckinCounts(
    nearbyCafes.map((c) => c.id),
  );

  const specs: { label: string; available: boolean }[] = [
    { label: "Wi-Fi", available: cafe.hasWifi },
    { label: "Outlets", available: cafe.hasOutlets },
    { label: "Room to stay (laptop-friendly)", available: cafe.laptopFriendly },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name: cafe.name,
    url: `${siteUrl}/chiang-mai/cafes/${cafe.slug}`,
    geo: {
      "@type": "GeoCoordinates",
      latitude: cafe.lat,
      longitude: cafe.lng,
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Chiang Mai",
      addressRegion: cafe.neighborhood ?? "Chiang Mai",
      addressCountry: "TH",
    },
    amenityFeature: [
      {
        "@type": "LocationFeatureSpecification",
        name: "Wi-Fi",
        value: cafe.hasWifi,
      },
      {
        "@type": "LocationFeatureSpecification",
        name: "Power outlets",
        value: cafe.hasOutlets,
      },
      {
        "@type": "LocationFeatureSpecification",
        name: "Laptop-friendly",
        value: cafe.laptopFriendly,
      },
    ],
  };

  // Lets Google show "Home › Chiang Mai › Cafés › {cafe}" in the rich snippet
  // instead of the bare URL — improves click-through, scoped to indexable
  // ancestors only.
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: "Chiang Mai",
        item: `${siteUrl}/chiang-mai`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Cafés",
        item: `${siteUrl}/chiang-mai/cafes`,
      },
      { "@type": "ListItem", position: 4, name: cafe.name },
    ],
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav>
        <Link
          href="/chiang-mai/cafes"
          className="font-mono text-xs uppercase tracking-widest text-accent underline-offset-4 hover:underline"
        >
          ← All cafés in Chiang Mai
        </Link>
      </nav>

      <header className="flex flex-col gap-2">
        <h1 className="font-display text-5xl font-medium leading-[1.05] sm:text-6xl">
          {cafe.name}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          {cafe.neighborhood && (
            <p className="font-mono text-xs uppercase tracking-widest text-muted">
              Chiang Mai · {cafe.neighborhood}
            </p>
          )}
          {cafe.submissionStatus === "pending" && (
            <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">
              Newly added · community-submitted
            </span>
          )}
        </div>
      </header>

      <CafeMap
        lat={cafe.lat}
        lng={cafe.lng}
        ariaLabel={`Map of ${cafe.name}`}
        nearbyCafes={nearbyCafes}
        nearbyActiveCounts={nearbyActiveCounts}
      />
      {nearbyCafes.length > 0 && (
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
          {nearbyCafes.length} other café{nearbyCafes.length === 1 ? "" : "s"}{" "}
          within 500m · click to switch
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${cafe.lat},${cafe.lng}&destination_name=${encodeURIComponent(cafe.name)}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-page hover:bg-accent-hover"
        >
          🧭 Get directions →
        </a>
        <a
          href={`geo:${cafe.lat},${cafe.lng}?q=${cafe.lat},${cafe.lng}(${encodeURIComponent(cafe.name)})`}
          className="rounded-full border border-bean px-5 py-2.5 text-sm font-medium text-ink/85 hover:bg-bean/40 sm:hidden"
        >
          Open in native maps
        </a>
      </div>

      <section className="flex flex-col gap-4 border-t border-dashed border-bean pt-6">
        <h2 className="font-serif text-2xl font-medium">What you&apos;ll find</h2>
        <ul className="grid gap-2 text-base sm:grid-cols-2">
          {specs.map((s) => (
            <li key={s.label} className="flex items-center gap-2">
              <span
                className={s.available ? "text-accent" : "text-muted/60"}
                aria-hidden
              >
                {s.available ? "✓" : "—"}
              </span>
              <span
                className={
                  s.available
                    ? "text-ink"
                    : "text-muted/70 line-through"
                }
              >
                {s.label}
              </span>
            </li>
          ))}
        </ul>
        <p className="font-mono text-xs text-muted">
          Specs are starter estimates and may not reflect today&apos;s seating
          or hours.
        </p>
      </section>

      <CheckinSection
        cafe={cafe}
        activeCount={activeCount}
        myCheckin={myCheckin}
        signedIn={sessionUser !== null}
        myIntent={myIntent}
        roster={roster}
        otherCheckin={
          mySession?.checkin && mySession.checkin.cafeSlug !== cafe.slug
            ? mySession.checkin
            : null
        }
        weeklyCheckins={weeklyCheckins}
        openIntentsInCity={openIntentsInCity}
      />
    </main>
  );
}

function CheckinSection({
  cafe,
  activeCount,
  myCheckin,
  signedIn,
  myIntent,
  roster,
  otherCheckin,
  weeklyCheckins,
  openIntentsInCity,
}: {
  cafe: Cafe;
  activeCount: number;
  myCheckin: Checkin | null;
  signedIn: boolean;
  myIntent: { kind: IntentKind; city: string; expiresAt: string } | null;
  roster: RosterEntry[] | null;
  otherCheckin: { cafeName: string; cafeSlug: string; expiresAt: string } | null;
  weeklyCheckins: number;
  openIntentsInCity: number;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-dashed border-bean pt-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-2xl font-medium">Working here right now</h2>
        {activeCount > 0 ? (
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 font-mono text-xs font-medium text-accent">
            {activeCount} {activeCount === 1 ? "nomad" : "nomads"}
          </span>
        ) : (
          <span className="font-mono text-xs uppercase tracking-wider text-muted">
            Nobody yet — be the first
          </span>
        )}
      </div>

      {myCheckin ? (
        <>
          <RefreshAt at={myCheckin.expiresAt} />
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink/85">
              You&apos;re checked in here ·{" "}
              <LiveCountdown
                expiresAt={myCheckin.expiresAt}
                className="font-mono text-xs text-accent"
              />
              <span className="ml-1 text-muted">on your 2-hour window.</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <form action={checkIn} className="flex flex-wrap gap-2">
                <input type="hidden" name="cafeId" value={cafe.id} />
                <input
                  name="note"
                  defaultValue={myCheckin.note ?? ""}
                  placeholder="add or edit a note · 80 chars"
                  maxLength={80}
                  className="min-w-[14rem] flex-1 rounded-full border border-bean bg-surface px-4 py-2 text-sm outline-none focus:border-accent dark:bg-bean/40"
                />
                <button
                  type="submit"
                  className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-page hover:bg-accent-hover"
                >
                  Save note
                </button>
              </form>
              <form action={extendCheckin}>
                <input type="hidden" name="checkinId" value={myCheckin.id} />
                <button
                  type="submit"
                  className="rounded-full border border-accent/60 px-4 py-2 text-sm font-medium text-accent hover:bg-accent-soft"
                >
                  Extend · +2h
                </button>
              </form>
              <form action={checkOut}>
                <input type="hidden" name="checkinId" value={myCheckin.id} />
                <button
                  type="submit"
                  className="rounded-full border border-bean px-4 py-2 text-sm font-medium text-ink/85 hover:bg-bean/40"
                >
                  Check out
                </button>
              </form>
            </div>
            <ShareCheckin
              cafeName={cafe.name}
              cafeUrl={`${siteUrl}/chiang-mai/cafes/${cafe.slug}`}
            />
          </div>

          {roster && roster.length > 0 && (
            <Roster roster={roster} myIntent={myIntent} />
          )}
        </>
      ) : signedIn ? (
        <div className="flex flex-col gap-3">
          {otherCheckin && (
            <div className="rounded-xl border border-amber-300/50 bg-amber-50/60 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              You&apos;re currently checked in at{" "}
              <Link
                href={`/chiang-mai/cafes/${otherCheckin.cafeSlug}`}
                className="font-medium underline-offset-2 hover:underline"
              >
                {otherCheckin.cafeName}
              </Link>
              . Checking in here ends that session.
            </div>
          )}
          <p className="text-sm text-muted">
            Say you&apos;re here for the next 2 hours so other nomads know
            this spot is alive today.
          </p>
          <form action={checkIn} className="flex flex-wrap gap-2">
            <input type="hidden" name="cafeId" value={cafe.id} />
            <input
              name="note"
              placeholder="optional: open to chat · wooden bench · headphones on"
              maxLength={80}
              className="min-w-[16rem] flex-1 rounded-full border border-bean bg-surface px-4 py-2 text-sm outline-none focus:border-accent dark:bg-bean/40"
            />
            <button
              type="submit"
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-page hover:bg-accent-hover"
            >
              I&apos;m working here · 2h
            </button>
          </form>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
            Note shows to anyone else also checked in here · others outside
            only see the count
          </p>
        </div>
      ) : (
        <AnonCheckinPreview
          cafe={cafe}
          activeCount={activeCount}
          weeklyCheckins={weeklyCheckins}
          openIntentsInCity={openIntentsInCity}
        />
      )}
    </section>
  );
}

// Anon visitor surface — they hit this page from Google ("best cafe in
// chiang mai akha ama"), a shared link, or the homepage map. The roster is
// gated behind co-presence per vision §4 ("symmetric reveal"), but we can
// still hand them honest activity signals (active now, past-week volume,
// city-wide meet density) without revealing identities. Goal: make sign-in
// feel like an obvious next step, not a paywall.
function AnonCheckinPreview({
  cafe,
  activeCount,
  weeklyCheckins,
  openIntentsInCity,
}: {
  cafe: Cafe;
  activeCount: number;
  weeklyCheckins: number;
  openIntentsInCity: number;
}) {
  const stats: { value: number; label: string }[] = [];
  if (activeCount > 0) {
    stats.push({
      value: activeCount,
      label: `${activeCount === 1 ? "nomad" : "nomads"} working here right now`,
    });
  }
  if (weeklyCheckins > 0) {
    stats.push({
      value: weeklyCheckins,
      label: "check-ins in the last 7 days",
    });
  }
  if (openIntentsInCity > 0) {
    stats.push({
      value: openIntentsInCity,
      label: "nomads open to meet in Chiang Mai",
    });
  }

  const headline =
    activeCount > 0
      ? `${activeCount} ${activeCount === 1 ? "nomad is" : "nomads are"} working at ${cafe.name} right now.`
      : weeklyCheckins > 0
        ? `${weeklyCheckins} nomads checked in at ${cafe.name} this week.`
        : `Be the first to check in at ${cafe.name}.`;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-base text-ink/85 sm:text-lg">{headline}</p>

      {stats.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-3 sm:gap-6">
          {stats.map((s) => (
            <li
              key={s.label}
              className="flex flex-col gap-1 rounded-2xl border border-dashed border-bean bg-bean/10 px-4 py-3 dark:bg-bean/5"
            >
              <p className="font-display text-3xl font-medium leading-none tabular-nums">
                {s.value.toLocaleString()}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
                {s.label}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/auth/signin?next=/chiang-mai/cafes/${cafe.slug}`}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-page hover:bg-accent-hover"
        >
          {activeCount > 0 ? "Sign in to join them →" : "Sign in to check in →"}
        </Link>
        <Link
          href="/chiang-mai/cafes"
          className="font-mono text-xs uppercase tracking-widest text-muted underline-offset-4 hover:text-accent hover:underline"
        >
          Other cafés in Chiang Mai →
        </Link>
      </div>

      <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
        Roster (who&apos;s here) reveals only to other checked-in nomads.
      </p>
    </div>
  );
}

function Roster({
  roster,
  myIntent,
}: {
  roster: RosterEntry[];
  myIntent: { id?: string; kind: IntentKind; city: string; expiresAt: string } | null;
}) {
  // Self first, then others sorted by recency (most-recent check-in last).
  const me = roster.find((r) => r.isMe);
  const others = roster.filter((r) => !r.isMe);
  // Need the owner's intent ID to wire up Accept on owner-view rows.
  const myIntentId =
    me?.intent && myIntent && me.intent.kind === myIntent.kind
      ? me.intent.id
      : null;

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-accent-soft/40 px-4 py-4">
      <IntentBroadcastStrip myIntent={myIntent} />

      <div className="flex flex-col gap-1 border-t border-dashed border-bean pt-3">
        <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
          Also checked in here · only visible to people in this room
        </p>
        <ul className="flex flex-col divide-y divide-dashed divide-bean">
          {me && <RosterRow entry={me} myIntentId={null} />}
          {others.map((entry) => (
            <RosterRow
              key={entry.id}
              entry={entry}
              myIntentId={myIntentId}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function IntentBroadcastStrip({
  myIntent,
}: {
  myIntent: { kind: IntentKind; city: string; expiresAt: string } | null;
}) {
  if (myIntent) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink/85">
          You&apos;re open to{" "}
          <span className="font-medium">
            {INTENT_KIND_LABEL[myIntent.kind]}
          </span>{" "}
          — anyone here can respond.{" "}
          <LiveCountdown
            expiresAt={myIntent.expiresAt}
            className="font-mono text-xs text-muted"
          />
        </p>
        <div className="flex items-center gap-2">
          <form action={clearIntent}>
            <button
              type="submit"
              className="rounded-full border border-bean px-3 py-1 text-xs font-medium text-ink/85 hover:bg-bean/40"
            >
              End intent
            </button>
          </form>
          <Link
            href="/chiang-mai/meet"
            className="font-mono text-[10px] uppercase tracking-widest text-accent underline-offset-4 hover:underline"
          >
            See responses →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-ink/85">
        <span className="font-medium">Open up so others can join you.</span>{" "}
        Pick one signal — visible only to people checked in here, until you
        match with one.
      </p>
      <div className="flex flex-wrap gap-2">
        {INTENT_KIND_ORDER.map((kind) => (
          <form key={kind} action={setIntent}>
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="city" value="chiang-mai" />
            <button
              type="submit"
              className="rounded-full border border-accent/60 bg-surface px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent hover:text-page"
            >
              {INTENT_KIND_LABEL[kind]}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}

function RosterRow({
  entry,
  myIntentId,
}: {
  entry: RosterEntry;
  myIntentId: string | null;
}) {
  return (
    <li className="flex flex-col gap-1 py-2.5 first:pt-1.5 last:pb-1.5">
      <div className="flex flex-wrap items-baseline gap-2">
        <span
          className={`font-mono text-sm font-medium ${entry.isMe ? "text-accent" : "text-ink"}`}
        >
          {entry.isMe ? "You" : `@${entry.handle}`}
        </span>
        {entry.intent && (
          <span className="rounded-full border border-accent/40 px-2 py-0.5 font-mono text-[10px] font-medium text-accent">
            {INTENT_KIND_LABEL[entry.intent.kind]}
          </span>
        )}
        <LiveTimeSince
          createdAt={entry.createdAt}
          prefix="here "
          className="font-mono text-[11px] text-muted"
        />
      </div>
      {entry.note && <p className="text-sm text-ink/85">{entry.note}</p>}

      {/*
        Two response surfaces per row:
        - Owner-view: if THIS person responded to MY intent, show Accept/Decline
          (highest priority — actionable for the viewer right now)
        - Responder-view: my response state to THEIR intent (was here before)
      */}
      {!entry.isMe && entry.theirResponseToMe && myIntentId && (
        <IncomingResponseAction
          response={entry.theirResponseToMe}
          intentId={myIntentId}
        />
      )}
      {!entry.isMe && entry.intent && !entry.theirResponseToMe && (
        <RosterResponseAction
          intentId={entry.intent.id}
          status={entry.myResponseStatus}
        />
      )}
    </li>
  );
}

function IncomingResponseAction({
  response,
  intentId,
}: {
  response: { id: string; status: import("@/lib/types").IntentResponseStatus };
  intentId: string;
}) {
  if (response.status === "accepted") {
    return (
      <Link
        href="/chiang-mai/meet"
        className="self-start font-mono text-[10px] uppercase tracking-widest text-accent underline-offset-4 hover:underline"
      >
        ✓ Matched — see contact →
      </Link>
    );
  }
  if (response.status === "declined") {
    // Owner already declined; keep it quiet, just a faint receipt.
    return (
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted/60">
        Declined
      </span>
    );
  }
  // pending — actionable for the owner. Two forms inline.
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-widest text-accent">
        Wants to join you
      </span>
      <form action={acceptResponse}>
        <input type="hidden" name="responseId" value={response.id} />
        <input type="hidden" name="intentId" value={intentId} />
        <button
          type="submit"
          className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-page hover:bg-accent-hover"
        >
          Accept →
        </button>
      </form>
      <form action={declineResponse}>
        <input type="hidden" name="responseId" value={response.id} />
        <button
          type="submit"
          className="rounded-full border border-bean px-3 py-1 text-xs font-medium text-ink/85 hover:bg-bean/40"
        >
          Decline
        </button>
      </form>
    </div>
  );
}

function RosterResponseAction({
  intentId,
  status,
}: {
  intentId: string;
  status: RosterEntry["myResponseStatus"];
}) {
  if (status === "accepted") {
    return (
      <Link
        href="/chiang-mai/meet"
        className="self-start font-mono text-[10px] uppercase tracking-widest text-accent underline-offset-4 hover:underline"
      >
        ✓ Matched — see contact →
      </Link>
    );
  }
  if (status === "pending") {
    return (
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
        Responded · pending
      </span>
    );
  }
  if (status === "declined") {
    return (
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
        Declined
      </span>
    );
  }
  return (
    <form action={respondToIntent} className="self-start">
      <input type="hidden" name="intentId" value={intentId} />
      <button
        type="submit"
        className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-page hover:bg-accent-hover"
      >
        I&apos;m in →
      </button>
    </form>
  );
}
