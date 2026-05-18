import Link from "next/link";
import { SampleCard } from "@/components/SampleCard";
import { siteDescription, siteName, siteUrl } from "@/lib/site";

export default function Home() {
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    alternateName: "acoffee — coffee in bio",
    url: siteUrl,
    description: siteDescription,
    inLanguage: "en",
  };

  return (
    <main className="flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-24">
        <div className="flex flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
            <span aria-hidden>☕</span>
            Meet builders, nomads &amp; interesting people
          </span>
          <h1 className="text-[clamp(2.75rem,6.5vw,5.25rem)] font-semibold leading-[1] tracking-tight text-ink">
            Coffee in bio.
          </h1>
          <p className="max-w-xl text-lg leading-[1.55] text-ink/70 sm:text-xl">
            Your friendly coffee chat page at{" "}
            <span className="font-medium text-ink">
              acoffee.com/{`{handle}`}
            </span>
            . Share your link once — get invited for coffee, online or in
            person, by builders, nomads, and interesting people.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/auth/signin?next=%2Fprofile%3Fonboarding%3D1"
              className="inline-flex items-center gap-2 rounded-2xl bg-accent px-5 py-3 text-base font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md"
            >
              Make your card
              <span aria-hidden>→</span>
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-1 rounded-2xl px-4 py-3 text-base font-medium text-ink/80 hover:text-accent"
            >
              How it works
            </Link>
          </div>
        </div>
        <div className="lg:pt-2">
          <SampleCard />
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-20 sm:px-6 sm:py-24"
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium uppercase tracking-wide text-accent">
            How it works
          </p>
          <h2 className="text-3xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-4xl">
            Three steps. One card. No swiping.
          </h2>
        </div>

        <ol className="grid gap-6 sm:grid-cols-3 sm:gap-6">
          {[
            {
              n: "1",
              emoji: "✋",
              title: "Claim your handle",
              body: (
                <>
                  Sign in once. Pick the URL others will recognise you by —{" "}
                  <span className="font-medium text-ink">
                    acoffee.com/{`{handle}`}
                  </span>
                  . That&apos;s your card forever.
                </>
              ),
            },
            {
              n: "2",
              emoji: "📝",
              title: "Fill your card",
              body: (
                <>
                  Your city, a line about what you&apos;re doing, what
                  you&apos;re up for. Add Telegram or WhatsApp so invites
                  actually land.
                </>
              ),
            },
            {
              n: "3",
              emoji: "☕",
              title: "Share & get invited",
              body: (
                <>
                  Drop your card link in a Slack, a tweet, a co-working
                  board. Nomads in your city click{" "}
                  <span className="font-medium text-ink">
                    &ldquo;Invite for coffee&rdquo;
                  </span>{" "}
                  and you&apos;re talking by tonight.
                </>
              ),
            },
          ].map((step) => (
            <li
              key={step.n}
              className="flex flex-col gap-4 rounded-2xl border border-bean bg-surface p-6 shadow-[0_8px_24px_-18px_rgba(42,31,24,0.25)]"
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="grid h-10 w-10 place-items-center rounded-2xl bg-accent-soft text-xl"
                >
                  {step.emoji}
                </span>
                <span className="text-sm font-medium text-muted">
                  Step {step.n}
                </span>
              </div>
              <h3 className="text-xl font-semibold tracking-tight text-ink">
                {step.title}
              </h3>
              <p className="text-base leading-[1.55] text-ink/75">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mx-auto w-full max-w-5xl px-4 pb-12 pt-12 sm:px-6">
        <div className="flex flex-col gap-3 border-t border-bean pt-6">
          <p className="font-serif text-base italic text-ink/85">
            Made between cafés. If you&apos;re reading this from a new city,
            welcome — make a card so the next person doesn&apos;t feel so
            alone.
          </p>
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
            acoffee ·{" "}
            <a
              className="underline-offset-2 hover:text-accent hover:underline"
              href="https://github.com/nomadcafe/acoffee"
              target="_blank"
              rel="noreferrer"
            >
              Open source
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}

