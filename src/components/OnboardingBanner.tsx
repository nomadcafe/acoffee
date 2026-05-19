import Link from "next/link";
import { getLocale } from "@/lib/i18n";
import { t } from "@/lib/i18n/dict";
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

  const locale = await getLocale();
  // Split the template around the literal `{handle}` token so we can
  // render the auto-handle as a styled <code> chunk inline. Each locale
  // decides where the placeholder sits in its sentence; we just glue
  // the two halves around the code element on render.
  const [pre, post] = t(locale, "onboarding.banner.text").split("{handle}");

  return (
    <div className="border-b border-accent/30 bg-accent-soft/70">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2 text-sm text-ink/85 sm:px-6">
        <p>
          <span aria-hidden className="mr-1">
            👋
          </span>
          {pre}
          <code className="rounded bg-surface/80 px-1.5 py-0.5 font-mono text-xs text-ink">
            @{handle}
          </code>
          {post}
        </p>
        <Link
          href="/profile?onboarding=1"
          className="text-sm font-medium text-accent underline-offset-4 hover:underline"
        >
          {t(locale, "onboarding.banner.cta")}
        </Link>
      </div>
    </div>
  );
}
