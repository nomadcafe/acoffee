import type { Metadata } from "next";
import Link from "next/link";
import { CardSharePanel } from "@/components/CardSharePanel";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";
import { InviteInbox } from "@/components/InviteInbox";
import {
  getMyInviteHistory,
  getMyPendingInvites,
  getMyProfile,
  getMyProfileStats,
  getSessionUser,
  listMySlots,
} from "@/lib/auth-queries";
import { getLocale } from "@/lib/i18n";
import { t, tmpl } from "@/lib/i18n/dict";
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
  const locale = await getLocale();
  if (!sessionUser) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-14 sm:py-20">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {t(locale, "profile.signin.h1")}
        </h1>
        <Link
          href="/auth/signin?next=/profile"
          className="inline-flex self-start items-center gap-2 rounded-2xl bg-accent px-5 py-3 text-base font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md"
        >
          {t(locale, "profile.signin.cta")} →
        </Link>
      </main>
    );
  }

  const [profile, stats, pendingInvites, inviteHistory, slots] =
    await Promise.all([
      getMyProfile(),
      getMyProfileStats(),
      getMyPendingInvites(),
      getMyInviteHistory(),
      listMySlots(),
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

  // Only show the share panel once the card is worth sharing — real
  // handle + at least one contact channel + a bio. Anything less and
  // we'd be prompting the user to broadcast a skeleton page that
  // visitors can't even invite from.
  const hasContact = !!(profile.telegramHandle || profile.emailContact);
  const isPublishable = hasRealHandle && !!profile.bio && hasContact;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          {isOnboarding
            ? t(locale, "profile.header.welcome.eyebrow")
            : t(locale, "profile.header.normal.eyebrow")}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {isOnboarding
            ? t(locale, "profile.header.welcome.h1")
            : t(locale, "profile.header.normal.h1")}
        </h1>
        <p className="text-base text-muted">
          {isOnboarding
            ? t(locale, "profile.header.welcome.sub")
            : t(locale, "profile.header.normal.sub")}
        </p>
      </header>

      {isPublishable && !isOnboarding && (
        <CardSharePanel handle={profile.handle} origin={siteUrl} />
      )}

      {hasRealHandle && !isOnboarding && (
        <InviteInbox
          pending={pendingInvites}
          history={inviteHistory}
          timezone={profile.timezone}
        />
      )}

      <ProfileForm
        profile={profile}
        slots={slots}
        after={isOnboarding ? afterPath : undefined}
      />

      {!isOnboarding && (
        <>
          <section className="mt-6 flex flex-col gap-4 border-t border-dashed border-bean pt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-accent">
              {t(locale, "account.eyebrow")}
            </p>
            {stats && (
              <div className="flex flex-col gap-2 text-sm text-muted">
                <p>
                  {t(locale, "account.yourCard")}{" "}
                  <Link
                    href={`/${profile.handle}`}
                    className="font-medium text-accent hover:underline"
                  >
                    acoffee.com/{profile.handle}
                  </Link>
                </p>
                <p>
                  {tmpl(t(locale, "account.joined"), {
                    date: formatJoined(stats.joinedAt, locale),
                  })}
                </p>
              </div>
            )}
            <p className="text-sm text-muted">
              {t(locale, "account.signedInAs")}
              <span className="font-medium text-ink">
                {sessionUser.email ?? "—"}
              </span>
            </p>
          </section>

          <section className="mt-2 flex flex-col gap-3 border-t border-dashed border-bean pt-6">
            <p className="text-xs font-medium uppercase tracking-wide text-red-600 dark:text-red-400">
              {t(locale, "danger.eyebrow")}
            </p>
            <DeleteAccountButton handle={profile.handle} />
          </section>
        </>
      )}
    </main>
  );
}

// Shows joined date as "May 2026" — month + year is enough granularity for
// account-age signal; exact day is noise. Locale param picks the right
// month name (May / 5月 / 5月) so the dict's "Joined {date}" template
// flows naturally.
function formatJoined(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale === "en" ? undefined : locale, {
    month: "short",
    year: "numeric",
  });
}

