import type { Metadata } from "next";
import Link from "next/link";
import { getMyProfile, getSessionUser } from "@/lib/auth-queries";
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

  const profile = await getMyProfile();
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
    </main>
  );
}
