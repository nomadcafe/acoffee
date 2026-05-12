"use client";
import { useState } from "react";

// Render once the viewer is checked in at a cafe. Three deep-link shares
// plus copy-to-clipboard. Single-row, lightweight — the goal is to make
// "bring a friend" a one-tap action, not a sharing dashboard.
//
// All deep-links use the public web URL of the cafe page so the receiver
// lands on something useful (roster, cafe details) even if not signed in.
export function ShareCheckin({
  cafeName,
  cafeUrl,
}: {
  cafeName: string;
  cafeUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const text = `I'm working at ${cafeName} on acoffee — join me if you're around.`;
  const encText = encodeURIComponent(text);
  const encUrl = encodeURIComponent(cafeUrl);

  const links: { label: string; href: string; emoji: string }[] = [
    {
      label: "Telegram",
      emoji: "💬",
      href: `https://t.me/share/url?url=${encUrl}&text=${encText}`,
    },
    {
      label: "WhatsApp",
      emoji: "📱",
      href: `https://wa.me/?text=${encText}%20${encUrl}`,
    },
    {
      label: "X",
      emoji: "𝕏",
      href: `https://twitter.com/intent/tweet?text=${encText}&url=${encUrl}`,
    },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${text} ${cafeUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context, browser policy). Fall back
      // to a prompt so the user can still grab the text manually.
      window.prompt("Copy this link:", `${text} ${cafeUrl}`);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-bean/80 bg-bean/10 p-3 dark:bg-bean/5">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
        Bring a friend
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-bean bg-surface px-3 py-1.5 text-xs font-medium text-ink/85 hover:bg-bean/40"
          >
            <span aria-hidden>{l.emoji}</span>
            <span>{l.label}</span>
          </a>
        ))}
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 rounded-full border border-bean bg-surface px-3 py-1.5 text-xs font-medium text-ink/85 hover:bg-bean/40"
        >
          <span aria-hidden>📋</span>
          <span>{copied ? "Copied!" : "Copy link"}</span>
        </button>
      </div>
    </div>
  );
}
