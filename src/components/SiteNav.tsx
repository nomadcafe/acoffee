import Link from "next/link";
import { signOut } from "@/app/auth/actions";
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
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="font-serif text-lg font-medium text-ink hover:opacity-80 dark:text-ink"
        >
          acoffee
        </Link>
        <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm">
          <Link
            href="/"
            className="rounded-full px-3 py-1.5 text-ink/85 hover:bg-bean/40 dark:text-ink/85 dark:hover:bg-bean/40"
          >
            World map
          </Link>
          <Link
            href="/chiang-mai"
            className="rounded-full px-3 py-1.5 text-ink/85 hover:bg-bean/40 dark:text-ink/85 dark:hover:bg-bean/40"
          >
            Chiang Mai
          </Link>
          {handle && (
            <Link
              href="/chiang-mai/meet"
              className="hidden rounded-full px-3 py-1.5 text-ink/85 hover:bg-bean/40 sm:inline dark:text-ink/85 dark:hover:bg-bean/40"
            >
              Meet
            </Link>
          )}
          {supabaseConfigured && (
            <span
              className="mx-1 hidden h-4 w-px bg-bean dark:bg-bean sm:inline-block"
              aria-hidden
            />
          )}
          {supabaseConfigured &&
            (handle ? (
              <form action={signOut} className="flex items-center gap-1">
                <Link
                  href="/profile"
                  className="hidden max-w-[8rem] truncate rounded-full px-3 py-1.5 text-muted hover:bg-bean/40 hover:text-ink sm:inline-block sm:max-w-none dark:text-muted/70 dark:hover:bg-bean/40 dark:hover:text-ink"
                  title={`@${handle} · edit profile`}
                >
                  @{handle}
                </Link>
                <button
                  type="submit"
                  className="rounded-full px-3 py-1.5 text-ink/85 hover:bg-bean/40 dark:text-ink/85 dark:hover:bg-bean/40"
                >
                  Sign out
                </button>
              </form>
            ) : (
              <Link
                href="/auth/signin"
                className="rounded-full bg-accent px-3 py-1.5 font-medium text-page hover:bg-accent-hover"
              >
                Sign in
              </Link>
            ))}
        </div>
      </div>
    </nav>
  );
}
