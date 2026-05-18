import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer, isAuthConfigured } from "@/lib/supabase/server";

// Auto-generated default by the handle_new_user trigger: "user_<8 hex chars>".
// We treat a still-auto handle as "first-time / hasn't onboarded yet" and
// route the user to /profile once before letting them in.
const AUTO_HANDLE = /^user_[a-f0-9]{8}$/;

// Same allow-list as the sign-in form: only same-origin paths. Returns
// null for "no valid next" so the callback can fall back to the user's
// own card page instead of a hard-coded route.
function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null; // protocol-relative
  return raw;
}

// Magic-link landing route. Supabase emails this URL (with ?code=...) and
// the user clicking it lands here. We exchange the code for a session
// cookie, route first-timers through /profile to claim a real handle,
// then redirect to `next` (or home).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  // Surface a structured `reason` on every failure path so the signin page
  // and Vercel logs can tell us which step broke without us guessing.
  const fail = (reason: string, detail?: string) => {
    console.error("[auth/callback] failed", { reason, detail, url: request.url });
    const params = new URLSearchParams({ error: "callback", reason });
    if (detail) params.set("detail", detail.slice(0, 200));
    return NextResponse.redirect(
      `${origin}/auth/signin?${params.toString()}`,
    );
  };

  if (!isAuthConfigured()) return fail("not_configured");
  if (!code) {
    // Supabase's verify endpoint can also redirect with ?error=... directly.
    const supabaseError = searchParams.get("error");
    const supabaseErrorDesc = searchParams.get("error_description");
    return fail(
      "no_code",
      supabaseError ? `${supabaseError}: ${supabaseErrorDesc ?? ""}` : undefined,
    );
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return fail("exchange_failed", `${error.code ?? ""} ${error.message}`);
  }

  // Check whether the user still has the auto-generated handle. If so, this
  // is their first sign-in (or they haven't bothered) — push them to /profile
  // and remember where they were trying to go so we can hand them off after.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let userHandle: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("handle")
      .eq("id", user.id)
      .maybeSingle();
    userHandle = (profile?.handle as string | undefined) ?? null;
    if (userHandle && AUTO_HANDLE.test(userHandle)) {
      // First-time: send to onboarding, remembering where they were
      // trying to go (their card page by default).
      const after = encodeURIComponent(next ?? `/${userHandle}`);
      return NextResponse.redirect(
        `${origin}/profile?onboarding=1&after=${after}`,
      );
    }
  }

  // Returning user (real handle). Honour explicit next, otherwise land
  // them on their own card so they immediately see what got shared.
  const destination = next ?? (userHandle ? `/${userHandle}` : "/");
  return NextResponse.redirect(`${origin}${destination}`);
}
