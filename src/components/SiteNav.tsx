import Link from "next/link";
import { Avatar } from "@/components/Avatar";
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

async function readSessionHandle(): Promise<string | null> {
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
      .select("handle")
      .eq("id", user.id)
      .maybeSingle();
    return (profile?.handle as string | undefined) ?? user.email ?? "you";
  } catch {
    return null;
  }
}

export async function SiteNav() {
  const supabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const handle = supabaseConfigured ? await readSessionHandle() : null;

  return (
    <nav className="border-b border-bean bg-page/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-ink hover:opacity-80"
        >
          acoffee
        </Link>
        <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
          {supabaseConfigured &&
            (handle ? (
              <Link
                href={`/${handle}`}
                className="inline-flex max-w-[12rem] items-center gap-2 rounded-full py-1 pl-1 pr-3 text-ink/85 hover:bg-bean/40"
                title={`@${handle} · your public card`}
              >
                <Avatar
                  handle={handle}
                  displayName={deriveDisplayName(handle)}
                  size="sm"
                />
                <span className="truncate text-sm font-medium">
                  @{handle}
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
