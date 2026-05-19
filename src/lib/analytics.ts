"use client";

import { sendGAEvent } from "@next/third-parties/google";

// Thin client-side wrapper around `sendGAEvent` from
// @next/third-parties/google. Call sites import `trackEvent(...)` so
// the underlying SDK + queueing behaviour live in one place — easier
// to globally toggle, redirect, or swap providers later.
//
// When `NEXT_PUBLIC_GA_ID` is unset, the GA script never mounts in the
// layout and gtag isn't on window; sendGAEvent pushes to dataLayer
// either way (it'll just sit there unsent — harmless). The
// `typeof window` guard catches the unlikely SSR call path.
//
// Params kept deliberately small + non-PII: no handles, no emails, no
// free-text bodies. Just enums, counts, and booleans so events stay
// safe to ship across the GA boundary.

export type EventParams = Record<string, string | number | boolean>;

export function trackEvent(name: string, params: EventParams = {}): void {
  if (typeof window === "undefined") return;
  try {
    sendGAEvent("event", name, params);
  } catch {
    // Swallow — analytics is never a reason to break the page.
  }
}
