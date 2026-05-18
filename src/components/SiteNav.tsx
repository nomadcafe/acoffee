import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { countMyPendingInvites } from "@/lib/auth-queries";
import { createSupabaseServer } from "@/lib/supabase/server";

// Same derivation as /[handle]/page.tsx — "alex_nomad" → "Alex Nomad".
// Inline because it's the only other surface that needs it and a shared
// helper would invert effort vs payoff.
function deriveDisplayName(handle: string): string {
  return handle
    .split("_")
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
}

async function readSessionProfile(): Promise<{
  handle: string;
  avatarUrl: string | null;
} | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("handle, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    const handle =
      (profile?.handle as string | undefined) ?? user.email ?? "you";
    return {
      handle,
      avatarUrl: (profile?.avatar_url as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

export async function SiteNav() {
  const supabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Run the session lookup + the inbox-count read in parallel — the second
  // call is the cheap exact-count head query, so the round-trip cost
  // overlaps with the profile fetch instead of stacking on top of it.
  const [session, pendingCount] = supabaseConfigured
    ? await Promise.all([readSessionProfile(), countMyPendingInvites()])
    : [null, 0];

  return (
    <nav className="border-b border-bean bg-page/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-ink hover:opacity-80"
        >
          acoffee
        </Link>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {supabaseConfigured && session && pendingCount > 0 && (
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-page shadow-sm hover:bg-accent-hover"
              title={`${pendingCount} pending invite${pendingCount === 1 ? "" : "s"}`}
            >
              <span className="relative inline-flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-page/60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-page" />
              </span>
              {pendingCount} invite{pendingCount === 1 ? "" : "s"}
            </Link>
          )}
          {supabaseConfigured &&
            (session ? (
              <Link
                href={`/${session.handle}`}
                className="inline-flex max-w-[12rem] items-center gap-2 rounded-full py-1 pl-1 pr-3 text-ink/85 hover:bg-bean/40"
                title={`@${session.handle} · your public card`}
              >
                <Avatar
                  handle={session.handle}
                  displayName={deriveDisplayName(session.handle)}
                  src={session.avatarUrl}
                  size="sm"
                />
                <span className="truncate text-sm font-medium">
                  @{session.handle}
                </span>
              </Link>
            ) : (
              <Link
                href="/auth/signin"
                className="rounded-2xl bg-accent px-4 py-2 font-medium text-page shadow-sm hover:bg-accent-hover hover:shadow-md"
              >
                Sign in
              </Link>
            ))}
        </div>
      </div>
    </nav>
  );
}
