import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import {
  getMyProfile,
  getMyProfileStats,
  getSessionUser,
} from "@/lib/auth-queries";
import { ProfileForm } from "./ProfileForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your profile",
  description: "Edit how other nomads see you on acoffee.",
  alternates: { canonical: "/profile" },
  robots: { index: false, follow: false },
};

function safeAfter(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  if (!raw.startsWith("/")) return undefined;
  if (raw.startsWith("//")) return undefined;
  return raw;
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ onboarding?: string; after?: string }>;
}) {
  const { onboarding, after } = await searchParams;
  const isOnboarding = onboarding === "1";
  const afterPath = safeAfter(after);

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-14 sm:py-20">
        <h1 className="font-display text-3xl font-medium sm:text-4xl">
          Sign in to edit your profile.
        </h1>
        <Link
          href="/auth/signin?next=/profile"
          className="self-start rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Sign in →
        </Link>
      </main>
    );
  }

  const [profile, stats] = await Promise.all([
    getMyProfile(),
    getMyProfileStats(),
  ]);
  if (!profile) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-14">
        <h1 className="font-display text-3xl font-medium">Profile not ready.</h1>
        <p className="text-sm text-muted">
          Your profile row hasn&apos;t been created yet. Make sure
          <code className="mx-1 rounded bg-bean/40 px-1.5 py-0.5 text-xs dark:bg-bean/40">
            supabase/schema_phase1.sql
          </code>
          has been applied — its trigger seeds a profile on signup.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-widest text-accent">
          {isOnboarding ? "acoffee · Welcome" : "acoffee · Profile"}
        </p>
        <h1 className="font-display text-3xl font-medium sm:text-4xl">
          {isOnboarding
            ? "Pick how others see you."
            : "How others see you."}
        </h1>
        <p className="text-sm text-muted">
          {isOnboarding
            ? "One-time setup. Pick a handle others can recognize you by. Telegram or WhatsApp lets you actually meet someone after matching."
            : "Telegram and WhatsApp stay hidden until you match with someone."}
        </p>
      </header>
      <ProfileForm profile={profile} after={isOnboarding ? afterPath : undefined} />

      {!isOnboarding && (
        <section className="mt-6 flex flex-col gap-4 border-t border-dashed border-bean pt-6">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
            Account
          </p>
          {stats && (
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="Joined" value={formatJoined(stats.joinedAt)} />
              <Stat label="Check-ins" value={stats.checkinCount.toString()} />
              <Stat label="Intents" value={stats.intentCount.toString()} />
              <Stat label="Matches" value={stats.matchCount.toString()} />
            </dl>
          )}
          <p className="text-sm text-muted">
            Signed in as{" "}
            <span className="font-medium text-ink">
              {sessionUser.email ?? "—"}
            </span>
          </p>
          <form action={signOut} className="self-start">
            <button
              type="submit"
              className="rounded-full border border-bean px-4 py-2 text-sm font-medium text-ink/85 hover:bg-bean/40"
            >
              Sign out
            </button>
          </form>
        </section>
      )}
    </main>
  );
}

// Shows joined date as "May 2026" — month + year is enough granularity for
// account-age signal; exact day is noise.
function formatJoined(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en", { month: "short", year: "numeric" });
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="font-mono text-[10px] uppercase tracking-widest text-muted">
        {label}
      </dt>
      <dd className="font-display text-2xl font-medium leading-none tabular-nums">
        {value}
      </dd>
    </div>
  );
}
