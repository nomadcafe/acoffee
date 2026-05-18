import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";

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
                className="max-w-[10rem] truncate rounded-full px-3 py-1.5 text-ink/85 hover:bg-bean/40"
                title={`@${handle} · your public card`}
              >
                @{handle}
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
