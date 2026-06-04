import { headers } from "next/headers";
import Link from "next/link";
import { countMyPendingInvites, getSessionNavProfile } from "@/lib/auth-queries";
import { currentHomeHref, getLocale } from "@/lib/i18n";
import { t, tmpl } from "@/lib/i18n/dict";
import { deriveDisplayName } from "@/lib/profile";
import { UserMenu } from "@/components/UserMenu";

export async function SiteNav() {
  const supabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Run the session lookup + the inbox-count read in parallel — the second
  // call is the cheap exact-count head query, so the round-trip cost
  // overlaps with the profile fetch instead of stacking on top of it. The
  // session read is cache()'d and shared with OnboardingBanner + the page
  // body, so this doesn't add its own getUser/profiles round-trips.
  const [session, pendingCount] = supabaseConfigured
    ? await Promise.all([getSessionNavProfile(), countMyPendingInvites()])
    : [null, 0];
  // Display handle for the user menu: real handle, else email, else a
  // neutral placeholder (a signed-in user with no profile row).
  const menuHandle = session?.handle ?? session?.email ?? "you";
  const [locale, homeHref] = await Promise.all([
    getLocale(),
    currentHomeHref(),
  ]);

  // Carry the current page as `next` so signing in returns the visitor to
  // where they were (e.g. the card they wanted to invite from) instead of
  // their own page. Skip auth paths to avoid a self-referential loop.
  const currentPath = (await headers()).get("x-pathname") ?? "";
  const signInHref =
    currentPath && !currentPath.startsWith("/auth")
      ? `/auth/signin?next=${encodeURIComponent(currentPath)}`
      : "/auth/signin";

  return (
    <nav className="relative z-40 border-b border-bean bg-page/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-6">
        <Link
          href={homeHref}
          aria-label="aCoffee — home"
          className="inline-flex items-baseline text-lg tracking-tight text-ink hover:opacity-80"
        >
          {/* Wordmark `aCoffee`. Two serif glyphs in accent colour bookend
              the sans 'offee' centre: a Fraunces italic 'a' (the article)
              and an upright Fraunces 'C' (the noun's capital). Same
              x-height bump (1.25em) keeps them visually paired without
              looking like two separate words. */}
          <span className="font-serif text-[1.25em] italic font-medium leading-none text-accent">
            a
          </span>
          <span className="font-serif text-[1.25em] font-medium leading-none text-accent">
            C
          </span>
          <span className="font-semibold">offee</span>
        </Link>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {/* Discovery entry point — locale-aware so /zh stays in /zh.
              Hidden for now: with few cards live, an empty Browse reads as
              "no one's here". Restore once there's enough density to land on.
              The /browse route itself stays reachable by direct link.
          <Link
            href={homeHref === "/" ? "/browse" : `${homeHref}/browse`}
            className="rounded-2xl px-3 py-2 font-medium text-ink/80 hover:text-accent"
          >
            {t(locale, "browse.nav")}
          </Link>
          */}
          {supabaseConfigured && session && pendingCount > 0 && (
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-page shadow-sm hover:bg-accent-hover"
              title={tmpl(t(locale, "nav.invitesPending"), {
                n: pendingCount,
                plural: pendingCount === 1 ? "" : "s",
              })}
            >
              <span className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-page/60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-page" />
              </span>
              {tmpl(t(locale, "nav.invitesPending"), {
                n: pendingCount,
                plural: pendingCount === 1 ? "" : "s",
              })}
            </Link>
          )}
          {supabaseConfigured &&
            (session ? (
              <UserMenu
                handle={menuHandle}
                displayName={deriveDisplayName(menuHandle)}
                avatarUrl={session.avatarUrl}
                sessionEmail={session.email}
              />
            ) : (
              <Link
                href={signInHref}
                className="rounded-2xl bg-accent px-4 py-2 font-medium text-page shadow-sm hover:bg-accent-hover hover:shadow-md"
              >
                {t(locale, "nav.signIn")}
              </Link>
            ))}
        </div>
      </div>
    </nav>
  );
}
