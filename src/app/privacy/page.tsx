import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What acoffee collects, what's public on your card, and how to remove your data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-14 sm:px-6 sm:py-20">
      <p className="text-xs font-medium uppercase tracking-wide text-accent">
        Privacy
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        What we collect and what stays public.
      </h1>
      <p className="text-sm text-muted">Last updated 2026-05-18</p>

      <Section title="What you give us">
        Everything on your card is supplied by you when you fill in the
        profile form: handle, status, city, chat-kind tags, and the
        contact channels you choose (Telegram, WhatsApp, email). Your
        sign-in email is stored separately by our auth provider so you can
        log back in.
      </Section>

      <Section title="What&apos;s public">
        Your card page at <Code>acoffee.com/{`{handle}`}</Code> is public.
        Anyone with the URL can see your handle, status, city, chat tags,
        and the initials avatar generated from your handle. Contact
        channels stay hidden until a visitor clicks <em>Invite for
        coffee</em>, at which point all channels you&apos;ve added become
        visible to them.
      </Section>

      <Section title="What&apos;s not public">
        Your sign-in email is never shown to other users. We don&apos;t
        track who clicked your <em>Invite for coffee</em> button, who
        viewed your card, or who you&apos;ve previously talked to —
        there&apos;s no invite log on our side. After contact reveal the
        conversation happens entirely on Telegram / WhatsApp / your email
        client, not on acoffee.
      </Section>

      <Section title="Third parties">
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            <strong>Supabase</strong> — Postgres database + auth. Stores
            your profile row and session cookie.
          </li>
          <li>
            <strong>Resend</strong> — sends the one-time welcome email
            after you finish onboarding. We don&apos;t send marketing.
          </li>
          <li>
            <strong>Google Analytics 4</strong> — anonymous page-view
            stats so we know which surfaces matter. No PII forwarded.
          </li>
          <li>
            <strong>Vercel</strong> — hosts the site. Standard server
            logs.
          </li>
        </ul>
      </Section>

      <Section title="Cookies">
        A Supabase session cookie keeps you signed in. GA sets analytics
        cookies. That&apos;s it — no third-party advertising or tracking
        pixels.
      </Section>

      <Section title="Remove your data">
        Edit any field on <Link href="/profile" className="text-accent hover:underline">/profile</Link>.
        To delete your card and account entirely, email{" "}
        <a
          href="mailto:hello@acoffee.com"
          className="text-accent hover:underline"
        >
          hello@acoffee.com
        </a>{" "}
        from the address you signed up with. A self-serve delete button
        is on the v0.8 roadmap.
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

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-md bg-bean/40 px-1.5 py-0.5 font-mono text-sm text-ink">
      {children}
    </code>
  );
}
