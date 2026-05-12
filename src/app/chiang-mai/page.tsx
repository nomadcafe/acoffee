import type { Metadata } from "next";
import Link from "next/link";
import { ActivityFeed } from "@/components/ActivityFeed";
import { PinMap } from "@/components/PinMap";
import { QuickCheckinPanel } from "@/components/QuickCheckin";
import { getMyActiveSession, getSessionUser } from "@/lib/auth-queries";
import { chiangMai } from "@/lib/cities";
import {
  countActiveIntents,
  listCafes,
  listPins,
  listRecentCheckins,
  listTopActiveCafes,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chiang Mai",
  description:
    "Cafés to work from. People to meet today. Chiang Mai is the first city open on acoffee.",
  alternates: { canonical: "/chiang-mai" },
  openGraph: {
    title: "Chiang Mai · acoffee",
    description:
      "Cafés to work from. People to meet today. Chiang Mai is the first city open on acoffee.",
    url: "/chiang-mai",
  },
};

export default async function ChiangMaiPage() {
  const [
    pins,
    cafes,
    intentCount,
    allActive,
    sessionUser,
    recentCheckins,
    mySession,
  ] = await Promise.all([
    listPins({ bbox: chiangMai.bbox }),
    listCafes({ city: "chiang-mai" }),
    countActiveIntents("chiang-mai"),
    listTopActiveCafes("chiang-mai", 50),
    getSessionUser(),
    listRecentCheckins("chiang-mai", 8),
    getMyActiveSession(),
  ]);
  const count = pins.length;
  const cafeCount = cafes.length;
  const topActive = allActive.slice(0, 3);
  const totalWorking = allActive.reduce((s, t) => s + t.activeCount, 0);
  const activeCafesCount = allActive.length;
  const myCheckinCafeName = mySession?.checkin?.cafeName ?? null;
  const hasMyIntent = mySession?.intent != null;

  return (
    <main className="flex flex-col">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 pb-10 pt-14 sm:px-6 sm:pb-14 sm:pt-20">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">
          Chiang Mai · Open
        </p>
        <h1 className="font-display text-5xl font-medium leading-[1.05] sm:text-7xl">
          {totalWorking > 0
            ? totalWorking === 1
              ? "1 nomad working in Chiang Mai right now."
              : `${totalWorking} nomads working in Chiang Mai right now.`
            : count > 0
              ? "Chiang Mai is quiet right now — but people are around."
              : "Be the first nomad in Chiang Mai."}
        </h1>
        <p className="max-w-xl text-lg text-muted sm:text-xl">
          {totalWorking > 0
            ? `Across ${activeCafesCount} café${activeCafesCount === 1 ? "" : "s"}. Cafés to work from. People to meet today.`
            : count > 0
              ? `${count} nomads pinned in the last month. Check in to say you're working today.`
              : "The first city open on acoffee. Cafés to work from. People to meet today. Drop a pin to say you're here."}
        </p>
      </section>

      <PinMap
        initialPins={pins}
        initialCenter={chiangMai.center}
        initialZoom={chiangMai.zoom}
        countSuffix="pinned in Chiang Mai"
        emptyLabel="No pins in Chiang Mai yet"
        height="h-[60vh] sm:h-[72vh]"
        framed={false}
        showNearMe={false}
        showDropPin={false}
        activeCafes={allActive}
      />

      <QuickCheckinPanel
        city="chiang-mai"
        cityName="Chiang Mai"
        signedIn={sessionUser !== null}
        activeCheckinCafeName={myCheckinCafeName}
      />

      <section className="mx-auto grid w-full max-w-5xl gap-px overflow-hidden border-t border-dashed border-bean px-4 pt-12 sm:px-6 sm:pt-16 sm:grid-cols-2 sm:gap-8">
        {cafeCount > 0 && (
          <Link
            href="/chiang-mai/cafes"
            className="group flex flex-col gap-2 py-2 transition sm:border-r sm:border-dashed sm:border-bean sm:pr-6"
          >
            <p className="font-mono text-xs uppercase tracking-widest text-accent">
              {cafeCount} hand-picked cafés
            </p>
            <h2 className="font-serif text-2xl font-medium transition group-hover:text-accent">
              Where to work from →
            </h2>
            <p className="text-sm text-muted">
              Wi-Fi, outlets, and room to stay. Across Nimman, Old City,
              Santitham, and the East Bank.
            </p>
          </Link>
        )}

        <Link
          href="/chiang-mai/meet"
          className="group flex flex-col gap-2 py-2 transition"
        >
          <p className="font-mono text-xs uppercase tracking-widest text-accent">
            {intentCount === 0
              ? "Open for meeting today"
              : intentCount === 1
                ? "1 nomad open today"
                : `${intentCount} nomads open today`}
          </p>
          <h2 className="font-serif text-2xl font-medium transition group-hover:text-accent">
            {hasMyIntent ? "See who responded →" : "Meet someone today →"}
          </h2>
          <p className="text-sm text-muted">
            {hasMyIntent
              ? "You're already open today. Check responses, manage your match, or change your kind."
              : sessionUser
                ? "One signal for coffee, cowork, dinner, or hike. No chat, no swiping. Tap to set yours."
                : "One signal for coffee, cowork, dinner, or hike. No chat, no swiping. Sign in to send or receive."}
          </p>
        </Link>
      </section>

      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 border-t border-dashed border-bean px-4 pb-4 pt-12 sm:px-6 sm:pt-16">
        <h2 className="font-serif text-2xl font-medium sm:text-3xl">
          Right now in Chiang Mai
        </h2>

        <div className="grid gap-px overflow-hidden border-y border-dashed border-bean sm:grid-cols-2">
          <div className="flex flex-col gap-1 py-4 sm:border-r sm:border-dashed sm:border-bean sm:pr-6">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
              Working at cafés
            </p>
            {totalWorking > 0 ? (
              <p className="font-display text-4xl font-medium leading-none">
                {totalWorking}
                <span className="ml-2 font-sans text-sm font-normal text-muted">
                  at {activeCafesCount} café{activeCafesCount === 1 ? "" : "s"}
                </span>
              </p>
            ) : (
              <p className="font-display text-2xl font-medium leading-tight text-muted">
                Quiet right now —{" "}
                <Link
                  href="/chiang-mai/cafes"
                  className="text-accent underline-offset-4 hover:underline"
                >
                  be the first →
                </Link>
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1 py-4 sm:pl-6">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
              Open to meet today
            </p>
            {intentCount > 0 ? (
              <p className="font-display text-4xl font-medium leading-none">
                {intentCount}
                <span className="ml-2 font-sans text-sm font-normal text-muted">
                  coffee · cowork · dinner · hike
                </span>
              </p>
            ) : (
              <p className="font-display text-2xl font-medium leading-tight text-muted">
                No one open yet —{" "}
                <Link
                  href="/chiang-mai/meet"
                  className="text-accent underline-offset-4 hover:underline"
                >
                  break the silence →
                </Link>
              </p>
            )}
          </div>
        </div>

        {topActive.length > 0 ? (
          <div className="flex flex-col gap-3">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
              Busy cafés right now
            </p>
            <ul className="flex flex-col">
              {topActive.map(({ cafe, activeCount }) => (
                <li key={cafe.id}>
                  <Link
                    href={`/chiang-mai/cafes/${cafe.slug}`}
                    className="group flex items-baseline justify-between gap-3 border-b border-dashed border-bean py-3 last:border-b-0"
                  >
                    <span className="flex flex-col gap-0.5">
                      <span className="font-serif text-lg font-medium transition group-hover:text-accent">
                        {cafe.name}
                      </span>
                      {cafe.neighborhood && (
                        <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                          {cafe.neighborhood}
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 font-mono text-xs font-medium text-accent">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inset-0 animate-ping rounded-full bg-accent/60" />
                        <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                      </span>
                      {activeCount} here
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-base text-muted">
            Quiet right now — no one&apos;s checked in.{" "}
            <Link
              href="/chiang-mai/cafes"
              className="font-medium text-accent underline-offset-4 hover:underline"
            >
              Be the first →
            </Link>
          </p>
        )}
      </section>

      <ActivityFeed items={recentCheckins} cityName="Chiang Mai" />

      <section className="mx-auto flex w-full max-w-5xl flex-col gap-3 border-t border-dashed border-bean px-4 pb-16 pt-10 sm:px-6">
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-muted">
          Why Chiang Mai first
        </h2>
        <ul className="grid gap-1.5 text-sm text-muted sm:grid-cols-2">
          <li>· Largest year-round nomad density in Southeast Asia.</li>
          <li>· Café and co-working culture is the default workspace.</li>
          <li>· Affordable enough that people stay for months, not days.</li>
          <li>· High Mandarin-speaking nomad share — underserved by EN tools.</li>
        </ul>
      </section>
    </main>
  );
}
