import type { Metadata } from "next";
import Link from "next/link";
import { InvitationCard } from "@/components/InvitationCard";
import { InviteLinkGenerator } from "@/components/InviteLinkGenerator";
import { getSessionNavProfile } from "@/lib/auth-queries";
import { currentHomeHref, getLocale } from "@/lib/i18n";
import { t, tmpl, type Locale } from "@/lib/i18n/dict";
import {
  buildInviteQuery,
  hasInvite,
  type InviteLinkData,
  parseInviteParams,
} from "@/lib/invite-link";
import { deriveDisplayName } from "@/lib/profile";
import { siteUrl } from "@/lib/site";

// The no-signup "invite someone for coffee" page. With no params it shows
// the link generator; with invite params it renders the shared invitation
// landing. Single URL (no /zh, /ja mirror) — locale resolves from the
// cookie + Accept-Language chain, and the page is noindex'd (every URL is a
// throwaway invitation, not a discoverable surface).
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Mirrors the auto-handle pattern from the handle_new_user trigger; a
// signed-in user still on the placeholder handle gets no name prefill.
const AUTO_HANDLE = /^user_[a-f0-9]{8}$/;

// Absolute OG image URL for an invitation (or the bare generator). `lang`
// is pinned so a cold social scraper renders the image in the same locale
// as the page, instead of falling back to English.
function ogImageUrl(data: InviteLinkData, locale: Locale): string {
  const q = buildInviteQuery(data);
  return `${siteUrl}/invite/og?${q ? `${q}&` : ""}lang=${locale}`;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const [locale, sp] = await Promise.all([getLocale(), searchParams]);
  const data = parseInviteParams(sp);
  const live = hasInvite(data);

  const title = t(locale, "inviteLink.meta.title");
  const description =
    live && data.from
      ? tmpl(t(locale, "inviteLink.meta.descFrom"), { from: data.from })
      : t(locale, "inviteLink.meta.desc");
  const ogTitle =
    live && data.from
      ? tmpl(t(locale, "inviteLink.card.headlineFrom"), { from: data.from })
      : title;
  const image = ogImageUrl(data, locale);

  return {
    title,
    description,
    // /invite URLs are per-share throwaways — keep them out of the index
    // but let crawlers follow the CTA into the real site.
    robots: { index: false, follow: true },
    openGraph: {
      title: ogTitle,
      description,
      type: "website",
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [image],
    },
  };
}

export default async function InvitePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [locale, sp, nav, homeHref] = await Promise.all([
    getLocale(),
    searchParams,
    getSessionNavProfile(),
    currentHomeHref(),
  ]);
  const data = parseInviteParams(sp);

  if (hasInvite(data)) {
    return (
      <InvitationLanding data={data} locale={locale} homeHref={homeHref} />
    );
  }

  // Prefill the inviter's name for signed-in users with a real handle, so
  // they don't retype it. The display name derives from the handle (there's
  // no separate name field), same as everywhere else in the app.
  const initialFrom =
    nav?.handle && !AUTO_HANDLE.test(nav.handle)
      ? deriveDisplayName(nav.handle)
      : "";

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-14 sm:px-6 sm:py-20">
      <p className="text-sm font-medium text-muted">
        <Link href={homeHref} className="hover:text-accent">
          acoffee
        </Link>
        <span className="mx-1.5 text-bean">·</span>
        {t(locale, "inviteLink.breadcrumb")}
      </p>

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {t(locale, "inviteLink.h1")}
        </h1>
        <p className="text-base leading-[1.55] text-ink/70">
          {t(locale, "inviteLink.subhead")}
        </p>
      </header>

      <InviteLinkGenerator origin={siteUrl} initialFrom={initialFrom} />
    </main>
  );
}

// What the recipient sees when they open a shared link: the invitation card
// plus the conversion CTA into signup. This is the growth loop — an invite
// from outside acoffee lands a non-user on a page whose call to action is
// "get your own coffee page".
function InvitationLanding({
  data,
  locale,
  homeHref,
}: {
  data: InviteLinkData;
  locale: Locale;
  homeHref: string;
}) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-14 sm:px-6 sm:py-20">
      <InvitationCard
        data={data}
        locale={locale}
        headingAs="h1"
        cta={
          <div className="flex flex-col gap-2">
            <Link
              href="/auth/signin"
              className="inline-flex w-fit items-center gap-2 rounded-2xl bg-accent px-5 py-3 text-base font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md"
            >
              {t(locale, "inviteLink.card.cta")}
              <span aria-hidden>→</span>
            </Link>
            <p className="text-xs text-muted">
              {t(locale, "inviteLink.card.ctaSub")}
            </p>
          </div>
        }
      />
      <p className="text-center text-xs text-muted">
        <Link href={homeHref} className="hover:text-accent">
          {t(locale, "inviteLink.card.what")}
        </Link>
      </p>
    </main>
  );
}
