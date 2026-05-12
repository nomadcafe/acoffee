import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Lost in transit",
  description:
    "This city isn't on acoffee's map yet — head back to the world map or step into Chiang Mai.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[78vh] w-full max-w-5xl flex-col justify-center gap-8 px-4 pb-16 pt-20 sm:px-6 sm:pb-24 sm:pt-28">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
        Issue 404 · A wrong turn
      </p>
      <h1 className="font-display text-[clamp(3rem,10vw,8rem)] font-medium leading-[0.95]">
        This city
        <br />
        isn&apos;t on the map
        <br />
        yet.
      </h1>
      <p className="max-w-2xl text-lg text-muted sm:text-xl sm:leading-[1.45]">
        Maybe you typed it wrong, maybe a link broke, maybe it&apos;s a café
        that already checked out. Wherever you meant to go, the map is right
        here.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-accent px-6 py-3 text-base font-medium text-page shadow-sm hover:bg-accent-hover"
        >
          ← Back to the world map
        </Link>
        <Link
          href="/chiang-mai"
          className="rounded-full border border-accent/60 px-6 py-3 text-base font-medium text-accent hover:bg-accent-soft"
        >
          Enter Chiang Mai →
        </Link>
      </div>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
        Or just drop a pin where you actually are — that&apos;s how new cities
        get on the map.
      </p>
    </main>
  );
}
