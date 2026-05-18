"use client";

import Link from "next/link";
import { useState } from "react";
import { useT } from "@/components/LocaleProvider";

// Shown on /profile once the user has claimed a real handle — the
// "your card is live, here's the URL" moment that closes v0.7 §0.2's
// activation loop. Without it, ProfileForm just blinks "Saved." with
// no payoff and the user has no obvious next step.
//
// The Twitter share intent doubles as the seed of distribution: most
// of v0.7's traffic loop runs through "I made a Coffee in bio page,
// here it is — invite me" tweets, so the share text is opinionated.
export function CardSharePanel({
  handle,
  origin,
}: {
  handle: string;
  // Server passes the absolute origin so the copied URL works regardless
  // of how the user arrived (preview deploy / acoffee.com / localhost).
  origin: string;
}) {
  const t = useT();
  const url = `${origin}/${handle}`;
  // Show the bare-domain form for visual cleanliness even though the
  // origin DNS keeps `www.` as canonical — modern share UIs do this. The
  // Copy button still copies the actual URL with scheme + www. so DNS
  // can do its 301 cleanly without an extra hop bug.
  const displayUrl = url.replace(/^https?:\/\/(www\.)?/, "");
  const [copied, setCopied] = useState(false);

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

  const tweetText = `My coffee chat page is live — invite me for a coffee ☕`;
  const tweetHref =
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}` +
    `&url=${encodeURIComponent(url)}`;

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
        <Link
          href={`/${handle}`}
          className="inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md"
        >
          {t("share.viewMyCard")}
          <span aria-hidden>→</span>
        </Link>
        <a
          href={tweetHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-2xl border border-bean bg-surface px-4 py-2.5 text-sm font-medium text-ink/85 hover:border-accent/60 hover:text-accent"
        >
          {t("share.shareOnX")}
          <span aria-hidden>↗</span>
        </a>
      </div>
    </section>
  );
}
