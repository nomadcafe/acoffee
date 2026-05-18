import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "Ground rules for using acoffee — claim a handle, be honest, don't harass.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-14 sm:px-6 sm:py-20">
      <p className="text-xs font-medium uppercase tracking-wide text-accent">
        Terms
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Ground rules — keep it human.
      </h1>
      <p className="text-sm text-muted">Last updated 2026-05-18</p>

      <Section title="Your card, your responsibility">
        Anything you put on your card — handle, status, city, contact
        info — is what visitors see. Don&apos;t impersonate someone else.
        Don&apos;t put information you don&apos;t want public on a public
        page. We don&apos;t verify identities; readers should treat any
        card with the same scepticism they would a stranger&apos;s
        Twitter bio.
      </Section>

      <Section title="What you can&apos;t do">
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            Send bulk commercial outreach via the contact channels you
            reveal — acoffee is for coffee chats, not cold sales.
          </li>
          <li>
            Harass, threaten, or sexually proposition people who invite
            you for coffee. Hand-off doesn&apos;t mean consent to
            anything beyond a coffee chat.
          </li>
          <li>
            Scrape card pages systematically. The data&apos;s public,
            but we&apos;ll rate-limit and block obvious crawlers.
          </li>
          <li>
            Claim a handle that infringes on someone else&apos;s
            trademark or impersonates a real person without their
            consent.
          </li>
        </ul>
      </Section>

      <Section title="Takedown / reports">
        Spotted a card that breaks any of the above? Email{" "}
        <a
          href="mailto:hello@acoffee.com"
          className="text-accent hover:underline"
        >
          hello@acoffee.com
        </a>{" "}
        with the URL and a one-line description. We&apos;ll review and
        remove cards that violate these terms. We may also delete
        accounts without warning for clearly abusive use.
      </Section>

      <Section title="No warranty">
        acoffee is provided <em>as is</em>, with no warranty of any kind.
        We don&apos;t guarantee uptime, the validity of any card, or the
        outcome of any coffee chat. The source is MIT-licensed —
        you&apos;re welcome to fork it.
      </Section>

      <Section title="Open source">
        The codebase lives at{" "}
        <a
          href="https://github.com/nomadcafe/acoffee"
          target="_blank"
          rel="noreferrer"
          className="text-accent hover:underline"
        >
          github.com/nomadcafe/acoffee
        </a>{" "}
        under the MIT license. Vision, MVP scope, and the changelog
        narrative live in{" "}
        <Link
          href="https://github.com/nomadcafe/acoffee/blob/main/docs/vision.md"
          className="text-accent hover:underline"
        >
          docs/vision.md
        </Link>
        .
      </Section>

      <Section title="Changes">
        These terms can change — if material, we&apos;ll bump the date at
        the top and email everyone with a real handle. By continuing to
        use acoffee after a change you accept the new version.
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold tracking-tight text-ink">
        {title}
      </h2>
      <div className="text-base leading-[1.6] text-ink/80">{children}</div>
    </section>
  );
}
