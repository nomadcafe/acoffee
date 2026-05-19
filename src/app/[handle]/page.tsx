import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CardBody } from "@/components/CardBody";
import { InviteForm } from "@/components/InviteForm";
import { getMyProfile } from "@/lib/auth-queries";
import { getLocale } from "@/lib/i18n";
import { t, tmpl } from "@/lib/i18n/dict";
import { siteUrl } from "@/lib/site";
import { createSupabaseServer, isAuthConfigured } from "@/lib/supabase/server";
import {
  COFFEE_CHAT_KINDS,
  GENDERS,
  type CoffeeChatKind,
  type Gender,
  type SocialLink,
} from "@/lib/types";
import { parseSocialLinks } from "@/lib/socials";

// Reserved handles that would shadow real top-level routes. The signup-time
// validator should also reject these (added in actions.ts), but keep the
// list here as a defense-in-depth 404 — Next's static routing already wins
// today, but a future static→dynamic route swap would silently break that.
const RESERVED_HANDLES = new Set([
  "api",
  "auth",
  "profile",
  "chiang-mai",
  "osaka",
  "lisbon",
  "bali",
  "settings",
  "admin",
  "about",
  "help",
  "terms",
  "privacy",
  "sitemap.xml",
  "robots.txt",
  // Locale-prefix folders for SEO i18n. /zh/ and /ja/ are static
  // routes that Next will match first, but list them here too so a
  // future routing swap can't silently lease them as handles.
  "zh",
  "ja",
  "en",
]);

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
      "handle, bio, city, coffee_chat_kinds, gender, telegram_handle, whatsapp_number, email_contact, social_links, avatar_url, created_at, updated_at",
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
  const viewer = await getMyProfile();
  const isOwner = viewer?.handle === profile.handle;
  const isIncomplete = !profile.bio || !profile.hasContact;
  const locale = await getLocale();

  const joinedLabel = formatJoined(profile.joinedAt);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-14 sm:px-6 sm:py-20">
      <p className="text-sm font-medium text-muted">
        <Link href="/" className="hover:text-accent">
          acoffee
        </Link>
        <span className="mx-1.5 text-bean">·</span>
        Coffee card
      </p>

      {isOwner && isIncomplete && (
        <section className="flex flex-col gap-3 rounded-3xl border border-accent/40 bg-accent-soft/60 p-5 sm:p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-accent">
            Almost there
          </p>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            This is your card — it&apos;s looking sparse.
          </h2>
          <p className="text-sm leading-[1.55] text-ink/70">
            {!profile.bio && !profile.hasContact
              ? "Add a one-line status and a contact channel — that's what makes the card worth sharing."
              : !profile.bio
                ? "Add a one-line status so visitors see what you're up to."
                : "Add at least one contact channel (Telegram, WhatsApp, or email) — otherwise no one can actually invite you."}
          </p>
          <Link
            href="/profile"
            className="inline-flex self-start items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md"
          >
            Finish your card
            <span aria-hidden>→</span>
          </Link>
        </section>
      )}

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

      <footer className="mt-2 flex flex-col gap-3 border-t border-dashed border-bean pt-6">
        {isOwner ? (
          <>
            <p className="text-sm italic text-ink/70">
              Your card lives here. Share the URL anywhere, or come back to
              edit it anytime.
            </p>
            <Link
              href="/profile"
              className="inline-flex self-start items-center gap-2 rounded-2xl border border-bean bg-surface px-4 py-2.5 text-sm font-medium text-ink/85 hover:border-accent/60 hover:text-accent"
            >
              Edit my card
              <span aria-hidden>→</span>
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm italic text-ink/70">
              Like this card? Make your own — share what you&apos;re
              working on, get invited for coffee in your next city.
            </p>
            <Link
              href="/auth/signin?next=%2Fprofile%3Fonboarding%3D1"
              className="inline-flex self-start items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md"
            >
              Make your card
              <span aria-hidden>→</span>
            </Link>
          </>
        )}
      </footer>
    </main>
  );
}

// "May 2026" granularity — month + year is enough magazine-style metadata
// without leaking exact signup days.
function formatJoined(iso: string): string {
  const d = new Date(iso);
  return `Joined ${d.toLocaleDateString("en", {
    month: "short",
    year: "numeric",
  })}`;
}
