import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CardBody } from "@/components/CardBody";
import { CardSharePanel } from "@/components/CardSharePanel";
import { InviteForm } from "@/components/InviteForm";
import { PresenceBanner } from "@/components/PresenceBanner";
import { WelcomeBeacon } from "@/components/WelcomeBeacon";
import { getMyProfile, getSessionUser } from "@/lib/auth-queries";
import { currentHomeHref, getLocale } from "@/lib/i18n";
import { t, tmpl, type Locale } from "@/lib/i18n/dict";
import { siteUrl } from "@/lib/site";
import { createSupabaseServer, isAuthConfigured } from "@/lib/supabase/server";
import {
  COFFEE_CHAT_KINDS,
  GENDERS,
  type CoffeeChatKind,
  type Gender,
  type SocialLink,
} from "@/lib/types";
import { RESERVED_HANDLES } from "@/lib/reserved-handles";
import { parseSocialLinks } from "@/lib/socials";

// Same handle format the profile form + DB CHECK enforce. Used here as a
// cheap pre-filter so bot probes (`xmlrpc.php`, `wp-login.php`, `.env`,
// `robots.txt.bak`, etc.) 404 without burning a Supabase round-trip.
// Mirrors the regex in profile/actions.ts checkHandleAvailable().
const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

// v0.8 deliberately strips raw contact channels from the public-facing
// fetch. Visitors no longer receive TG/WA/Email in the page payload —
// the invite-then-email flow on accept is the only path to those values
// now. A single `hasContact` boolean is enough for the UI to choose
// between the invite form and the "no contact yet" empty state.
type PublicProfile = {
  handle: string;
  displayName: string;
  bio: string | null;
  city: string | null;
  // v0.11 — ISO date (YYYY-MM-DD) for the presence banner. Past dates
  // are kept in the type but PresenceBanner suppresses them at render.
  cityUntil: string | null;
  coffeeChatKinds: CoffeeChatKind[];
  // v0.9 — gender soft signal. null = "prefer not to say".
  gender: Gender | null;
  // v0.10 — bio.link-style dynamic socials. Empty array hides the row.
  // These are public discovery links — already public elsewhere — so
  // they live on the card without invite-accept. The gated contact
  // channels stay separate behind `hasContact`.
  socialLinks: SocialLink[];
  hasContact: boolean;
  avatarUrl: string | null;
  joinedAt: string;
  // BEFORE UPDATE trigger on profiles bumps this on every row change.
  // Used as a `?v=` cache-bust on the OG image URL so social previews
  // refetch when the card content changes.
  updatedAt: string;
};

async function fetchPublicProfile(handle: string): Promise<PublicProfile | null> {
  if (!isAuthConfigured()) return null;
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "handle, bio, city, city_until, coffee_chat_kinds, gender, telegram_handle, whatsapp_number, email_contact, social_links, avatar_url, created_at, updated_at",
    )
    .eq("handle", handle.toLowerCase())
    .maybeSingle();
  if (error) return null;
  if (!data) return null;

  return {
    handle: data.handle as string,
    displayName: deriveDisplayName(data.handle as string),
    bio: (data.bio as string | null) ?? null,
    city: (data.city as string | null) ?? null,
    cityUntil: (data.city_until as string | null) ?? null,
    coffeeChatKinds: parseChatKinds(data.coffee_chat_kinds),
    gender: parseGender(data.gender),
    socialLinks: parseSocialLinks(data.social_links),
    hasContact: !!(
      data.telegram_handle ||
      data.whatsapp_number ||
      data.email_contact
    ),
    avatarUrl: (data.avatar_url as string | null) ?? null,
    joinedAt: data.created_at as string,
    updatedAt:
      (data.updated_at as string | undefined) ??
      (data.created_at as string),
  };
}

function parseGender(raw: unknown): Gender | null {
  if (typeof raw !== "string") return null;
  return (GENDERS as readonly string[]).includes(raw) ? (raw as Gender) : null;
}

// "alex_nomad" → "Alex Nomad". Handles aren't real names, but a Title-cased
// derived form reads better as the H1 than the raw lowercase slug.
function deriveDisplayName(handle: string): string {
  return handle
    .split("_")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function parseChatKinds(raw: unknown): CoffeeChatKind[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set<string>(COFFEE_CHAT_KINDS);
  return raw.filter((v): v is CoffeeChatKind =>
    typeof v === "string" && allowed.has(v),
  );
}

export async function generateMetadata(
  { params }: { params: Promise<{ handle: string }> },
): Promise<Metadata> {
  const { handle } = await params;
  // Same shortcut as HandlePage — skip the DB for obviously-malformed
  // probe handles so generateMetadata doesn't double the cost.
  if (!HANDLE_RE.test(handle.toLowerCase())) {
    return { title: "Card not found · acoffee", robots: { index: false } };
  }
  const profile = await fetchPublicProfile(handle);
  if (!profile) {
    return { title: "Card not found · acoffee", robots: { index: false } };
  }
  const title = `${profile.displayName} · acoffee`;
  const description = profile.bio
    ? profile.bio
    : `${profile.displayName}'s coffee card on acoffee${profile.city ? ` — ${profile.city}` : ""}.`;
  // Cache-bust the social preview by versioning the OG URL with the
  // profile's updated_at timestamp. The opengraph-image.tsx route
  // ignores the query — but Twitter / Slack key their preview cache on
  // the URL string, so a fresh `?v=` after the user updates anything
  // forces a refetch on the next scrape.
  const ogVersion = new Date(profile.updatedAt).getTime();
  const ogUrl = `${siteUrl}/${profile.handle}/opengraph-image?v=${ogVersion}`;
  return {
    title,
    description,
    alternates: { canonical: `/${profile.handle}` },
    openGraph: {
      title,
      description,
      type: "profile",
      url: `${siteUrl}/${profile.handle}`,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogUrl],
    },
  };
}

export default async function HandlePage(
  { params }: { params: Promise<{ handle: string }> },
) {
  const { handle } = await params;
  const lower = handle.toLowerCase();
  // Reject bot probes (`xmlrpc.php`, `.env`, etc.) before hitting the DB.
  if (!HANDLE_RE.test(lower)) notFound();
  if (RESERVED_HANDLES.has(lower)) notFound();
  const profile = await fetchPublicProfile(handle);
  if (!profile) notFound();

  // Owner detection: if the signed-in viewer's handle matches the page,
  // they get edit affordances instead of the "make your own" CTA, and
  // an "almost there" nudge when the card has no status or contact yet.
  const [viewer, sessionUser, locale, homeHref] = await Promise.all([
    getMyProfile(),
    getSessionUser(),
    getLocale(),
    currentHomeHref(),
  ]);
  const isOwner = viewer?.handle === profile.handle;
  const isIncomplete = !profile.bio || !profile.hasContact;
  // Viewer is a signed-in acoffee user but NOT the card owner — they
  // qualify for the streamlined invite path (skip email confirm).
  // Owners viewing their own card don't see a form at all so we don't
  // need to gate that case here.
  const visitorSession =
    sessionUser && viewer && !isOwner
      ? {
          handle: viewer.handle,
          displayName: deriveDisplayName(viewer.handle),
          email: sessionUser.email ?? "",
        }
      : null;

  const joinedLabel = formatJoined(profile.joinedAt, locale);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-14 sm:px-6 sm:py-20">
      {/* Owner-only GA beacon. Fires `signup_completed` when the
          updateProfile redirect lands here with ?welcome=1 and strips
          the query. Other visitors don't trigger this since the param
          is never set on a fresh visit. */}
      <WelcomeBeacon />
      <p className="text-sm font-medium text-muted">
        <Link href={homeHref} className="hover:text-accent">
          acoffee
        </Link>
        <span className="mx-1.5 text-bean">·</span>
        {t(locale, "card.breadcrumb")}
      </p>

      {isOwner && isIncomplete && (
        <section className="flex flex-col gap-3 rounded-3xl border border-accent/40 bg-accent-soft/60 p-5 sm:p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">
            {t(locale, "card.nudge.eyebrow")}
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            {t(locale, "card.nudge.title")}
          </h2>
          <p className="text-sm leading-[1.55] text-ink/70">
            {!profile.bio && !profile.hasContact
              ? t(locale, "card.nudge.body.both")
              : !profile.bio
                ? t(locale, "card.nudge.body.status")
                : t(locale, "card.nudge.body.contact")}
          </p>
          <Link
            href="/profile"
            className="inline-flex self-start items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md"
          >
            {t(locale, "card.nudge.cta")}
            <span aria-hidden>→</span>
          </Link>
        </section>
      )}

      <PresenceBanner
        city={profile.city}
        cityUntil={profile.cityUntil}
        locale={locale}
      />

      <CardBody
        handle={profile.handle}
        displayName={profile.displayName}
        city={profile.city}
        locator={joinedLabel}
        status={profile.bio}
        kinds={profile.coffeeChatKinds}
        gender={profile.gender}
        socialLinks={profile.socialLinks}
        avatarUrl={profile.avatarUrl}
        locale={locale}
        footer={
          isOwner ? (
            // Owner self-view: the in-card footer is just a quiet
            // identifier — the page-level footer below the card carries
            // the "Edit my card →" CTA. Rendering the live InviteForm
            // here would let you invite yourself, which is silly.
            <p className="text-sm italic text-muted">
              {profile.hasContact
                ? t(locale, "card.owner.note.invitable")
                : t(locale, "card.owner.note.noContact")}
            </p>
          ) : profile.hasContact ? (
            <InviteForm
              hostHandle={profile.handle}
              hostDisplayName={profile.displayName}
              hostKinds={profile.coffeeChatKinds}
              visitorSession={visitorSession}
            />
          ) : (
            <p className="text-sm text-muted">
              {tmpl(t(locale, "card.noContact"), {
                name: profile.displayName,
              })}
            </p>
          )
        }
      />

      {/* Owner-only share panel — same surface as /profile, with the
          "View my card" link suppressed since you're already on it. Only
          shown once the card is worth sharing (has a status + a contact
          channel); the incomplete state above is the call to action
          before that. */}
      {isOwner && !isIncomplete && (
        <CardSharePanel handle={profile.handle} origin={siteUrl} hideViewCard />
      )}

      <footer className="mt-2 flex flex-col gap-3 border-t border-dashed border-bean pt-6">
        {isOwner ? (
          <>
            <p className="text-sm italic text-ink/70">
              {t(locale, "card.owner.footer.note")}
            </p>
            <Link
              href="/profile"
              className="inline-flex self-start items-center gap-2 rounded-2xl border border-bean bg-surface px-4 py-2.5 text-sm font-medium text-ink/85 hover:border-accent/60 hover:text-accent"
            >
              {t(locale, "card.owner.footer.cta")}
              <span aria-hidden>→</span>
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm italic text-ink/70">
              {t(locale, "card.visitor.footer.note")}
            </p>
            <Link
              href="/auth/signin?next=%2Fprofile%3Fonboarding%3D1"
              className="inline-flex self-start items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md"
            >
              {t(locale, "hero.cta.makeCard")}
              <span aria-hidden>→</span>
            </Link>
          </>
        )}
      </footer>
    </main>
  );
}

// "May 2026" granularity — month + year is enough magazine-style metadata
// without leaking exact signup days. The date is formatted in the
// viewer's locale and wrapped in the localised `account.joined` template
// (en "Joined {date}" / zh "{date} 加入" / ja "{date} 参加") so the meta
// line doesn't mix English into a zh/ja card.
function formatJoined(iso: string, locale: Locale): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString(localeToBcp47(locale), {
    month: "short",
    year: "numeric",
  });
  return tmpl(t(locale, "account.joined"), { date });
}

// zh needs the region subtag for Intl to pick the right month names;
// en/ja work as-is. Mirrors PresenceBanner's local helper.
function localeToBcp47(locale: Locale): string {
  return locale === "zh" ? "zh-CN" : locale;
}
