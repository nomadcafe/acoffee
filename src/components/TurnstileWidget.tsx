"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

// Minimal explicit-render wrapper for Cloudflare Turnstile. Renders the
// widget once the script is ready and hands the solved token back via
// onToken (and "" on expiry/error so the caller can keep submit disabled).
// Turnstile tokens are single-use, so the caller remounts this via a React
// key after each submit to mint a fresh one.
type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function TurnstileWidget({
  siteKey,
  onToken,
}: {
  siteKey: string;
  onToken: (token: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // Hold the latest onToken in a ref so the render effect doesn't re-run
  // (and re-render the widget) when the parent passes a new closure.
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);
  // If a previous mount already loaded the script, next/script's onLoad
  // won't fire again — seed `ready` from the existing global so we don't
  // depend on a second onLoad that never comes.
  const [ready, setReady] = useState(
    () => typeof window !== "undefined" && !!window.turnstile,
  );

  useEffect(() => {
    if (!ready || !containerRef.current || !window.turnstile) return;
    const id = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token: string) => onTokenRef.current(token),
      "expired-callback": () => onTokenRef.current(""),
      "error-callback": () => onTokenRef.current(""),
    });
    widgetIdRef.current = id;
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // widget already torn down — ignore
        }
      }
    };
  }, [ready, siteKey]);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
      />
      <div ref={containerRef} />
    </>
  );
}
