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
