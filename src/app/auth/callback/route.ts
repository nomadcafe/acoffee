import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer, isAuthConfigured } from "@/lib/supabase/server";

// Auto-generated default by the handle_new_user trigger: "user_<8 hex chars>".
// We treat a still-auto handle as "first-time / hasn't onboarded yet" and
// route the user to /profile once before letting them in.
const AUTO_HANDLE = /^user_[a-f0-9]{8}$/;

// Same allow-list as the sign-in form: only same-origin paths.
function safeNext(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/"; // protocol-relative
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

  if (!code || !isAuthConfigured()) {
    return NextResponse.redirect(`${origin}/auth/signin?error=callback`);
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/auth/signin?error=callback`);
  }

  // Check whether the user still has the auto-generated handle. If so, this
  // is their first sign-in (or they haven't bothered) — push them to /profile
  // and remember where they were trying to go so we can hand them off after.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("handle")
      .eq("id", user.id)
      .maybeSingle();
    const handle = profile?.handle as string | undefined;
    if (handle && AUTO_HANDLE.test(handle)) {
      const after = encodeURIComponent(next);
      return NextResponse.redirect(
        `${origin}/profile?onboarding=1&after=${after}`,
      );
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
