import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// True when both Supabase env vars are set so the auth flow can run.
// Callers in auth code should check this before creating a client — without
// it, createSupabaseServer throws "URL and Key are required".
export function isAuthConfigured(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Service-role admin client. Bypasses RLS — use ONLY for genuine admin
// operations (e.g. auth.admin.deleteUser, which is the only way to remove
// an auth.users row server-side). Throws when SUPABASE_SERVICE_ROLE_KEY
// isn't configured so the caller fails loudly instead of silently doing
// nothing.
export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "createSupabaseAdmin requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Server-side Supabase client tied to the request's cookies. Use this from
// Server Components, Server Actions, Route Handlers, and the proxy.
// Auth is via the anon key + RLS; service-role lookups still go through
// `src/lib/store.ts` for unauthenticated/admin reads.
export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component where cookies are read-only.
            // Safe to ignore — proxy.ts refreshes tokens on each request.
          }
        },
      },
    },
  );
}
