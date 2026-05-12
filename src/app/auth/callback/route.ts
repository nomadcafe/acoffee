import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer, isAuthConfigured } from "@/lib/supabase/server";

// Auto-generated default by the handle_new_user trigger: "user_<8 hex chars>".
// We treat a still-auto handle as "first-time / hasn't onboarded yet" and
// route the user to /profile once before letting them in.
const AUTO_HANDLE = /^user_[a-f0-9]{8}$/;

// Same allow-list as the sign-in form: only same-origin paths. Default
// lands new users on /chiang-mai (the active city) instead of the home
// page — they've already seen home if they're signing in, and the city
// page is where the actual product lives.
function safeNext(raw: string | null): string {
  const fallback = "/chiang-mai";
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback; // protocol-relative
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
