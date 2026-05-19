"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

// Renders on /[handle]. When the URL carries `?welcome=1` — set by the
// updateProfile redirect on first onboarding completion — it fires the
// `signup_completed` GA event and immediately strips the query so a
// refresh doesn't re-fire and the URL stays clean for sharing.
export function WelcomeBeacon() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("welcome") !== "1") return;
    trackEvent("signup_completed");
    // router.replace with the bare pathname removes the query without
    // pushing a history entry — back-button still works as expected.
    router.replace(pathname);
  }, [pathname, router, searchParams]);

  return null;
}
