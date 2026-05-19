"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

// Tiny client component embedded on the confirm-success page. Fires a
// single `invite_confirmed` GA event when it mounts and renders
// nothing — the confirm route itself is a server component, so a
// purely-client effect is the only way to talk to gtag from there.
//
// Strict-mode double-mount in dev would fire twice; in prod the
// component mounts once. Acceptable noise — GA already dedupes on
// session boundaries and this event is a low-rate funnel step.
export function ConfirmEventBeacon() {
  useEffect(() => {
    trackEvent("invite_confirmed");
  }, []);
  return null;
}
