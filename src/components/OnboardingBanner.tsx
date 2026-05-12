import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";

// Auto handles are written by the handle_new_user trigger on signup:
// "user_<8 hex>". Matching one means the user never finished onboarding —
// roster / meet rows would render @user_ab12cd34 which is ugly and feels
// like an empty seat. Banner stays in their face until they pick a real
// handle.
//
// Missing TG/WA used to trigger a second stage of this banner, but that
// was felt as nag — email notification + the contact reveal fall back to
// email anyway, so the TG/WA push lives only in the profile form copy
// (label "Recommended") now.
const AUTO_HANDLE = /^user_[a-f0-9]{8}$/;

export async function OnboardingBanner() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }

  let handle: string | null = null;
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from("profiles")
      .select("handle")
      .eq("id", user.id)
      .maybeSingle();
    handle = (data?.handle as string | undefined) ?? null;
  } catch {
    return null;
  }

  if (!handle || !AUTO_HANDLE.test(handle)) return null;

  return (
    <div className="border-b border-amber-300/50 bg-amber-50/70 px-4 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-1 sm:px-2">
        <p>
          <span aria-hidden className="mr-1">👋</span>
          You&apos;re showing up as{" "}
          <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-xs dark:bg-amber-500/20">
            @{handle}
          </code>
          {" "}— pick a real handle so others can find you.
        </p>
        <Link
          href="/profile?onboarding=1"
          className="font-mono text-xs font-semibold uppercase tracking-widest underline-offset-4 hover:underline"
        >
          Pick a handle →
        </Link>
      </div>
    </div>
  );
}
