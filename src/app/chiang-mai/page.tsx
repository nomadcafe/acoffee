import type { Metadata } from "next";
import { PinMap } from "@/components/PinMap";
import { SubscribeForm } from "@/components/SubscribeForm";
import { chiangMai } from "@/lib/cities";
import { listPins } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chiang Mai",
  description:
    "See which nomads are in Chiang Mai right now. Drop a pin, get on the list for the meetup app launch.",
  alternates: { canonical: "/chiang-mai" },
  openGraph: {
    title: "Chiang Mai · Nomad Meetup",
    description:
      "See which nomads are in Chiang Mai right now. Drop a pin, get on the list for the meetup app launch.",
    url: "/chiang-mai",
  },
};

export default async function ChiangMaiPage() {
  const pins = await listPins({ bbox: chiangMai.bbox });
  const count = pins.length;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
          Launch city · Chiang Mai
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
          {count === 0
            ? "Be the first nomad in Chiang Mai."
            : count === 1
              ? "1 nomad in Chiang Mai right now."
              : `${count} nomads in Chiang Mai right now.`}
        </h1>
        <p className="max-w-xl text-base text-zinc-600 dark:text-zinc-400 sm:text-lg">
          Chiang Mai is where Nomad Meetup launches first. The full app — café
          check-ins, one-tap &ldquo;coffee today?&rdquo; — is coming. Drop a pin
          to say you&apos;re here, or leave your email to get the first invite.
        </p>
      </header>

      <PinMap
        initialPins={pins}
        initialCenter={chiangMai.center}
        initialZoom={chiangMai.zoom}
        countSuffix="pinned in Chiang Mai"
        emptyLabel="No pins in Chiang Mai yet"
        height="h-[55vh] sm:h-[65vh]"
      />

      <section className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold">Get the launch invite</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            One email when the Chiang Mai meetup app opens. No spam.
          </p>
          <div className="mt-4">
            <SubscribeForm city="chiang-mai" />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold">Telegram group</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            A small group of nomads in Chiang Mai sharing café picks and meetups.
            Opening soon — leave your email above and we&apos;ll send the invite.
          </p>
          <p className="mt-4 inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
            Coming soon
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold">Why Chiang Mai first</h2>
        <ul className="grid gap-2 text-sm text-zinc-600 dark:text-zinc-400 sm:grid-cols-2">
          <li>• Largest year-round nomad density in Southeast Asia.</li>
          <li>• Café and co-working culture is already the default workspace.</li>
          <li>• Affordable enough that people stay for months, not days.</li>
          <li>• High Mandarin-speaking nomad share — underserved by EN tools.</li>
        </ul>
      </section>
    </main>
  );
}
