import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CardBody } from "@/components/CardBody";
import { CardContactReveal } from "@/components/CardContactReveal";
import { siteUrl } from "@/lib/site";
import { createSupabaseServer, isAuthConfigured } from "@/lib/supabase/server";
import { COFFEE_CHAT_KINDS, type CoffeeChatKind } from "@/lib/types";

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
]);

type PublicProfile = {
  handle: string;
  displayName: string;
  bio: string | null;
  city: string | null;
  coffeeChatKinds: CoffeeChatKind[];
  telegramHandle: string | null;
  whatsappNumber: string | null;
  emailContact: string | null;
  joinedAt: string;
};

async function fetchPublicProfile(handle: string): Promise<PublicProfile | null> {
  if (!isAuthConfigured()) return null;
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "handle, bio, city, coffee_chat_kinds, telegram_handle, whatsapp_number, email_contact, created_at",
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
    telegramHandle: (data.telegram_handle as string | null) ?? null,
    whatsappNumber: (data.whatsapp_number as string | null) ?? null,
    emailContact: (data.email_contact as string | null) ?? null,
    joinedAt: data.created_at as string,
  };
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
  const profile = await fetchPublicProfile(handle);
  if (!profile) {
    return { title: "Card not found · acoffee", robots: { index: false } };
  }
  const title = `${profile.displayName} · acoffee`;
  const description = profile.bio
    ? profile.bio
    : `${profile.displayName}'s coffee card on acoffee${profile.city ? ` — ${profile.city}` : ""}.`;
  return {
    title,
    description,
    alternates: { canonical: `/${profile.handle}` },
    openGraph: {
      title,
      description,
      type: "profile",
      url: `${siteUrl}/${profile.handle}`,
    },
  };
}

export default async function HandlePage(
  { params }: { params: Promise<{ handle: string }> },
) {
  const { handle } = await params;
  if (RESERVED_HANDLES.has(handle.toLowerCase())) notFound();
  const profile = await fetchPublicProfile(handle);
  if (!profile) notFound();

  const joinedLabel = formatJoined(profile.joinedAt);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-14 sm:px-6 sm:py-20">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
        <Link href="/" className="hover:text-accent">
          acoffee
        </Link>
        <span className="mx-1.5 text-bean">·</span>
        Coffee card
      </p>

      <CardBody
        handle={profile.handle}
        displayName={profile.displayName}
        city={profile.city}
        locator={joinedLabel}
        status={profile.bio}
        kinds={profile.coffeeChatKinds}
        footer={
          <CardContactReveal
            displayName={profile.displayName}
            telegramHandle={profile.telegramHandle}
            whatsappNumber={profile.whatsappNumber}
            emailContact={profile.emailContact}
          />
        }
      />

      <footer className="flex flex-col gap-3 border-t border-dashed border-bean pt-6">
        <p className="font-serif text-sm italic text-ink/70">
          Like this card? Make your own — share what you&apos;re working on,
          get invited for coffee in your next city.
        </p>
        <Link
          href="/auth/signin?next=%2Fprofile%3Fonboarding%3D1"
          className="inline-flex self-start items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md"
        >
          Make your card
          <span aria-hidden>→</span>
        </Link>
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
