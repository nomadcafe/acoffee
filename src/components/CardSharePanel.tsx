"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useT } from "@/components/LocaleProvider";
import { trackEvent } from "@/lib/analytics";
import { tmpl } from "@/lib/i18n/dict";

// Shown on /profile once the user has claimed a real handle — the
// "your card is live, here's the URL" moment that closes v0.7 §0.2's
// activation loop. Without it, ProfileForm just blinks "Saved." with
// no payoff and the user has no obvious next step.
//
// Also reused on the owner's own /[handle] card view (with hideViewCard)
// so the share affordance lives where the card does — no detour back to
// /profile just to grab the link.
//
// Distribution is the growth engine (v0.7 §0.2): most traffic runs
// through "I made a Coffee in bio page, invite me" shares. So the panel
// fans the URL out across the channels nomads actually live in —
// the native mobile share sheet first, then WhatsApp / Telegram / X /
// LinkedIn — rather than betting the whole loop on a single X intent.

// Inline 18px brand glyphs. Kept local (not in SocialIcons, which is
// typed to SocialPlatform) so this component stays self-contained and
// can carry WhatsApp / Telegram marks that aren't public-profile socials.
function Glyph({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="currentColor"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const GLYPHS = {
  x: (
    <Glyph>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.658l-5.214-6.817-5.967 6.817H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </Glyph>
  ),
  whatsapp: (
    <Glyph>
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.46 1.32 4.97L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.79 13.97c-.25.7-1.45 1.34-2 1.41-.51.06-1.16.09-1.87-.12-.43-.13-.98-.31-1.69-.62-2.97-1.28-4.91-4.27-5.06-4.47-.15-.2-1.21-1.61-1.21-3.07s.77-2.18 1.04-2.48c.27-.3.59-.37.79-.37l.57.01c.18.01.43-.07.67.51.25.6.85 2.07.93 2.22.07.15.12.32.02.52-.1.2-.15.32-.3.49-.15.17-.32.38-.45.51-.15.15-.31.31-.13.61.18.3.8 1.32 1.72 2.14 1.18 1.05 2.18 1.38 2.49 1.53.31.15.49.13.67-.08.18-.2.77-.9.98-1.21.2-.3.41-.25.69-.15.28.1 1.78.84 2.09.99.31.15.51.22.59.35.08.13.08.74-.17 1.44z" />
    </Glyph>
  ),
  telegram: (
    <Glyph>
      <path d="M21.94 4.6 18.6 20.36c-.25 1.1-.91 1.38-1.84.86l-5.05-3.72-2.44 2.35c-.27.27-.5.5-1.02.5l.36-5.16 9.4-8.49c.41-.36-.09-.56-.63-.2L5.16 13.4l-4.98-1.56c-1.08-.34-1.1-1.08.23-1.6L20.55 3.04c.9-.33 1.69.21 1.39 1.56z" />
    </Glyph>
  ),
  linkedin: (
    <Glyph>
      <path d="M20.45 20.45h-3.55v-5.56c0-1.32-.03-3.03-1.85-3.03-1.85 0-2.13 1.45-2.13 2.94v5.65H9.37V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.26 2.37 4.26 5.46zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0z" />
    </Glyph>
  ),
} as const;

export function CardSharePanel({
  handle,
  origin,
  // When the panel renders on the card itself, the "View my card" link
  // points at the page you're already on — suppress it there.
  hideViewCard = false,
}: {
  handle: string;
  // Server passes the absolute origin so the copied URL works regardless
  // of how the user arrived (preview deploy / acoffee.com / localhost).
  origin: string;
  hideViewCard?: boolean;
}) {
  const t = useT();
  const url = `${origin}/${handle}`;
  // Show the bare-domain form for visual cleanliness even though the
  // origin DNS keeps `www.` as canonical — modern share UIs do this. The
  // Copy button still copies the actual URL with scheme + www. so DNS
  // can do its 301 cleanly without an extra hop bug.
  const displayUrl = url.replace(/^https?:\/\/(www\.)?/, "");
  const [copied, setCopied] = useState(false);
  // navigator.share is unknown at SSR time. useSyncExternalStore returns
  // the server snapshot (false) for the initial paint, then the client
  // snapshot on hydration — so the native button only appears where it
  // actually works (mostly mobile) with no hydration mismatch and no
  // setState-in-effect. Capability never changes, so subscribe is a noop.
  const canNativeShare = useSyncExternalStore(
    () => () => {},
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard denied / unsupported — fall back to selecting the text
      // so the user can hit Cmd+C manually. Rare enough to not surface UI.
      const range = document.createRange();
      const node = document.getElementById("acoffee-share-url");
      if (node) {
        range.selectNodeContents(node);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }

  // One opinionated line, reused across every text-carrying channel
  // (native sheet / WhatsApp / Telegram / X). LinkedIn's share-offsite
  // endpoint ignores text, so it gets the URL only.
  const shareText = t("share.tweet.text");

  async function nativeShare() {
    try {
      await navigator.share({ title: "acoffee", text: shareText, url });
      // share() resolves only on a real share; a cancel rejects, so this
      // line never fires for dismissals.
      trackEvent("card_shared", { channel: "native" });
    } catch {
      // User dismissed the sheet, or the target rejected — nothing to do.
    }
  }

  const channels = [
    {
      key: "x",
      label: "X",
      href:
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}` +
        `&url=${encodeURIComponent(url)}`,
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`,
    },
    {
      key: "telegram",
      label: "Telegram",
      href:
        `https://t.me/share/url?url=${encodeURIComponent(url)}` +
        `&text=${encodeURIComponent(shareText)}`,
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
  ] as const;

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-accent/40 bg-accent-soft/60 p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          {t("share.eyebrow")}
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
          {t("share.h2")}
        </h2>
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-bean bg-surface px-4 py-3">
        <span
          id="acoffee-share-url"
          className="flex-1 truncate font-mono text-sm text-ink"
        >
          {displayUrl}
        </span>
        <button
          type="button"
          onClick={copyUrl}
          aria-label={
            copied ? t("share.copy.ariaCopied") : t("share.copy.ariaIdle")
          }
          className="shrink-0 rounded-xl bg-ink px-3 py-1.5 text-xs font-medium text-page hover:bg-ink/85"
        >
          {copied ? t("share.copied") : t("share.copy")}
        </button>
      </div>
      <span className="sr-only" aria-live="polite">
        {copied ? t("share.live.announcement") : ""}
      </span>

      <div className="flex flex-wrap items-center gap-3">
        {!hideViewCard && (
          <Link
            href={`/${handle}`}
            className="inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md"
          >
            {t("share.viewMyCard")}
            <span aria-hidden>→</span>
          </Link>
        )}

        {canNativeShare && (
          // Mobile-first primary share. Opens the OS share sheet so the
          // user can drop the link into whatever they already use —
          // iMessage, Signal, Slack, a note — without us enumerating it.
          <button
            type="button"
            onClick={nativeShare}
            className="inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md"
          >
            <span aria-hidden>↗</span>
            {t("share.native")}
          </button>
        )}

        {/* Per-channel deep links — always available, the only share path
            on desktop where there's no native sheet. */}
        <div className="flex items-center gap-2">
          {channels.map((c) => (
            <a
              key={c.key}
              href={c.href}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackEvent("card_shared", { channel: c.key })}
              aria-label={tmpl(t("share.channelAria"), { channel: c.label })}
              title={tmpl(t("share.channelAria"), { channel: c.label })}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-bean bg-surface text-ink/75 transition-colors hover:border-accent/60 hover:text-accent"
            >
              {GLYPHS[c.key]}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
