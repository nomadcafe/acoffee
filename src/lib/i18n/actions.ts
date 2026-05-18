"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createSupabaseServer, isAuthConfigured } from "@/lib/supabase/server";
import { isLocale } from "./dict";

// Persist the user's chosen locale in a long-lived first-party cookie.
// Cookie wins over the Accept-Language fallback so the choice sticks
// across browser-language switches (e.g. travelling to Japan with a
// Chinese phone). 1-year TTL — language preference is durable, not a
// session thing.
//
// When signed in, mirror the choice into profiles.locale so host-facing
// emails (new-invite notification etc.) land in the same language the
// user is actually browsing in.
export async function setLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  const cookieStore = await cookies();
  cookieStore.set("locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });

  if (isAuthConfigured()) {
    try {
      const supabase = await createSupabaseServer();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // RLS profiles_write_own allows this. Failure is non-fatal — the
        // cookie still persists, host emails just fall back to 'en' until
        // the next sync.
        await supabase
          .from("profiles")
          .update({ locale })
          .eq("id", user.id);
      }
    } catch (e) {
      console.warn("[setLocale] profile sync failed (non-fatal)", e);
    }
  }

  // Refresh the layout tree so server components re-render with the
  // new locale immediately (no need to wait for a full navigation).
  revalidatePath("/", "layout");
}
