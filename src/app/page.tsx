import Link from "next/link";
import { PinMap } from "@/components/PinMap";
import { SubscribeForm } from "@/components/SubscribeForm";
import { listPins } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const pins = await listPins();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
          Nomad Meetup · Phase 0
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
          Where are nomads right now?
        </h1>
        <p className="max-w-xl text-base text-zinc-600 dark:text-zinc-400 sm:text-lg">
          Drop a pin, see who else just landed in your city. The full meetup app
          launches in Chiang Mai first — leave your email if you want in.
        </p>
      </header>

      <PinMap initialPins={pins} />

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 sm:p-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Chiang Mai · launching first</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            See which cafés have nomads working right now. Send a one-tap
            &ldquo;coffee today?&rdquo; to people nearby. No chat, no swiping.
            Available in Chiang Mai when we launch.
          </p>
        </div>
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
          <SubscribeForm city="chiang-mai" />
          <Link
            href="/chiang-mai"
            className="text-sm font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400"
          >
            Open the Chiang Mai page →
          </Link>
        </div>
      </section>

      <footer className="flex flex-col gap-1 border-t border-zinc-200 pt-6 text-xs text-zinc-500 dark:border-zinc-800">
        <p>Nomad Meetup — landing tool for digital nomads.</p>
        <p>
          Map tiles by{" "}
          <a
            className="underline hover:text-zinc-900 dark:hover:text-zinc-300"
            href="https://openfreemap.org/"
            target="_blank"
            rel="noreferrer"
          >
            OpenFreeMap
          </a>{" "}
          · © OpenStreetMap contributors.
        </p>
      </footer>
    </main>
  );
}
