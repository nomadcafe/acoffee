import type { Metadata } from "next";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { CardSharePanel } from "@/components/CardSharePanel";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";
import { InviteInbox } from "@/components/InviteInbox";
import {
  getMyPendingInvites,
  getMyProfile,
  getMyProfileStats,
  getSessionUser,
} from "@/lib/auth-queries";
import { siteUrl } from "@/lib/site";
import { ProfileForm } from "./ProfileForm";

// Trigger-generated handles look like "user_a1b2c3d4" — those aren't worth
// showing the share panel for, the URL would point at a placeholder.
const AUTO_HANDLE = /^user_[a-f0-9]{8}$/;

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

  const [profile, stats, pendingInvites] = await Promise.all([
    getMyProfile(),
    getMyProfileStats(),
    getMyPendingInvites(),
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

  const hasRealHandle = !AUTO_HANDLE.test(profile.handle);
  // Only show the onboarding header when the URL says so AND the user
  // genuinely hasn't picked a handle yet. Stops "Welcome / Pick how others
  // see you" from appearing for returning users who hit /profile?onboarding=1
  // via a stale link or the signin → next redirect.
  const isOnboarding = onboarding === "1" && !hasRealHandle;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          {isOnboarding ? "Welcome to acoffee" : "Your acoffee card"}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {isOnboarding
            ? "Pick how others see you."
            : "How others see you."}
        </h1>
        <p className="text-base text-muted">
          {isOnboarding
            ? "One-time setup. Pick a handle others can recognize you by, then add Telegram, WhatsApp, or email so invites actually land."
            : "Edit your card below. Contact channels stay hidden until someone invites you for coffee."}
        </p>
      </header>

      {hasRealHandle && !isOnboarding && (
        <CardSharePanel handle={profile.handle} origin={siteUrl} />
      )}

      {hasRealHandle && !isOnboarding && (
        <InviteInbox invites={pendingInvites} />
      )}

      <ProfileForm profile={profile} after={isOnboarding ? afterPath : undefined} />

      {!isOnboarding && (
        <>
          <section className="mt-6 flex flex-col gap-4 border-t border-dashed border-bean pt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-accent">
              Account
            </p>
            {stats && (
              <div className="flex flex-col gap-2 text-sm text-muted">
                <p>
                  Your card:{" "}
                  <Link
                    href={`/${profile.handle}`}
                    className="font-medium text-accent hover:underline"
                  >
                    acoffee.com/{profile.handle}
                  </Link>
                </p>
                <p>Joined {formatJoined(stats.joinedAt)}</p>
              </div>
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
                className="rounded-2xl border border-bean bg-surface px-4 py-2 text-sm font-medium text-ink/85 hover:border-accent/60 hover:text-accent"
              >
                Sign out
              </button>
            </form>
          </section>

          <section className="mt-2 flex flex-col gap-3 border-t border-dashed border-bean pt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-red-600 dark:text-red-400">
              Danger zone
            </p>
            <DeleteAccountButton />
          </section>
        </>
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

