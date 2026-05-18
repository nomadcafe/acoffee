"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isLocale } from "./dict";

// Persist the user's chosen locale in a long-lived first-party cookie.
// Cookie wins over the Accept-Language fallback so the choice sticks
// across browser-language switches (e.g. travelling to Japan with a
// Chinese phone). 1-year TTL — language preference is durable, not a
// session thing.
export async function setLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return;
  const cookieStore = await cookies();
  cookieStore.set("locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });
  // Refresh the layout tree so server components re-render with the
  // new locale immediately (no need to wait for a full navigation).
  revalidatePath("/", "layout");
}
