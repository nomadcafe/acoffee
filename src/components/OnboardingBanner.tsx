import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";

// Auto handles are written by the handle_new_user trigger on signup:
// "user_<8 hex>". Matching one means the user never finished onboarding —
// roster / meet rows would render @user_ab12cd34 which is ugly and feels
// like an empty seat. Two-stage nag:
//   stage 1 — auto handle still in place → "pick a handle"
//   stage 2 — real handle but no telegram + no whatsapp → "add a chat
//             handle so matches can reach you" (vision §4 hands off to
//             TG/WA, not email; without either the handoff is broken)
// Either stage links to /profile and dismisses on save.
const AUTO_HANDLE = /^user_[a-f0-9]{8}$/;

type Stage = "pick-handle" | "add-contact" | null;

export async function OnboardingBanner() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }

  let handle: string | null = null;
  let telegram: string | null = null;
  let whatsapp: string | null = null;
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from("profiles")
      .select("handle, telegram_handle, whatsapp_number")
      .eq("id", user.id)
      .maybeSingle();
    handle = (data?.handle as string | undefined) ?? null;
    telegram = (data?.telegram_handle as string | null | undefined) ?? null;
    whatsapp = (data?.whatsapp_number as string | null | undefined) ?? null;
  } catch {
    return null;
  }

  const stage: Stage =
    !handle
      ? null
      : AUTO_HANDLE.test(handle)
        ? "pick-handle"
        : !telegram && !whatsapp
          ? "add-contact"
          : null;

  if (!stage) return null;

  const copy =
    stage === "pick-handle"
      ? {
          emoji: "👋",
          body: (
            <>
              You&apos;re showing up as{" "}
              <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-xs dark:bg-amber-500/20">
                @{handle}
              </code>
              {" "}— pick a real handle so others can find you.
            </>
          ),
          cta: "Pick a handle →",
        }
      : {
          emoji: "💬",
          body: (
            <>
              Add a Telegram or WhatsApp so matches can actually reach you —
              without one, accepts fall back to email.
            </>
          ),
          cta: "Add chat handle →",
        };

  return (
    <div className="border-b border-amber-300/50 bg-amber-50/70 px-4 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-1 sm:px-2">
        <p>
          <span aria-hidden className="mr-1">{copy.emoji}</span>
          {copy.body}
        </p>
        <Link
          href="/profile?onboarding=1"
          className="font-mono text-xs font-semibold uppercase tracking-widest underline-offset-4 hover:underline"
        >
          {copy.cta}
        </Link>
      </div>
    </div>
  );
}
