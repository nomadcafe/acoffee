import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// URL prefixes that drive per-locale rendering. The marketing surfaces
// (/, /privacy, /terms) live under both the root path (= en, canonical)
// and a `/{locale}/...` variant for the non-default locales. The proxy
// detects the URL prefix and writes an `x-url-locale` request header so
// getLocale() can pick it up server-side — URL wins over cookie when
// present, which is required for SEO clarity (Google should never see
// the same URL with two different language renders).
const URL_LOCALE_RE = /^\/(zh|ja)(\/|$)/;

// Next 16's `proxy` is what older docs call `middleware`. Runs before each
// matched request; we use it to refresh Supabase auth tokens so server
// components see a fresh session.
export async function proxy(request: NextRequest) {
  // Tag the locale onto the forwarded request so RSC/route handlers can
  // read it via headers(). Only set when the URL itself encodes locale —
  // otherwise getLocale() falls through to cookie + Accept-Language.
  const urlLocaleMatch = URL_LOCALE_RE.exec(request.nextUrl.pathname);
  const urlLocale = urlLocaleMatch?.[1] ?? null;
  if (urlLocale) {
    request.headers.set("x-url-locale", urlLocale);
  }

  // Expose the current path (+ query) so server components can build a
  // "come back here after sign-in" link. SiteNav's sign-in button uses
  // this for `?next=`, so signing in from someone's card returns you to
  // that card instead of dumping you on your own page.
  request.headers.set(
    "x-pathname",
    request.nextUrl.pathname + request.nextUrl.search,
  );

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // No Supabase configured (dev / fallback mode) — just pass through.
  if (!supabaseUrl || !anonKey) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Forces a token refresh if expiring; do not run other supabase calls here.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Run on everything except static assets and Next internals.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|woff2?|css|js)$).*)",
  ],
};
