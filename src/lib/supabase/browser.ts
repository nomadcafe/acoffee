"use client";
import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client. Use this in Client Components that need
// real-time auth state (e.g. signing out, reacting to onAuthStateChange).
export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
