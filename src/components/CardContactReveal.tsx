"use client";

import { useState } from "react";

// Client-side reveal: "Invite for coffee" toggles the contact row. v0.7 §0.3
// rules out a real invite/accept handshake, so the gate here is purely UI —
// the framing ("contacts revealed on invite") still steers the user toward
// a thoughtful click instead of cold-scraping the page.
export function CardContactReveal({
  displayName,
  telegramHandle,
  whatsappNumber,
  emailContact,
}: {
  displayName: string;
  telegramHandle: string | null;
  whatsappNumber: string | null;
  emailContact: string | null;
}) {
  const [revealed, setRevealed] = useState(false);
  const hasContact = !!(telegramHandle || whatsappNumber || emailContact);

  if (!hasContact) {
    return (
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
        {displayName} hasn&apos;t added a contact channel yet.
      </p>
    );
  }

  if (!revealed) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">Contact unlocks on invite</p>
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-page shadow-sm transition-shadow hover:bg-accent-hover hover:shadow-md"
        >
          Invite for coffee
          <span aria-hidden>→</span>
        </button>
      </div>
    );
  }

  // Build a contact list with the cheapest tap-to-act link per channel.
  // Telegram uses t.me deep links, WhatsApp uses wa.me, email uses mailto.
  const items: { label: string; href: string; display: string }[] = [];
  if (telegramHandle) {
    items.push({
      label: "Telegram",
      href: `https://t.me/${telegramHandle.replace(/^@/, "")}`,
      display: `@${telegramHandle.replace(/^@/, "")}`,
    });
  }
  if (whatsappNumber) {
    items.push({
      label: "WhatsApp",
      href: `https://wa.me/${whatsappNumber.replace(/^\+/, "")}`,
      display: whatsappNumber,
    });
  }
  if (emailContact) {
    items.push({
      label: "Email",
      href: `mailto:${emailContact}`,
      display: emailContact,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-accent">Say hi — pick a channel</p>
      <ul className="flex flex-col gap-2">
        {items.map((it) => (
          <li
            key={it.label}
            className="flex items-center justify-between gap-3 rounded-2xl border border-bean bg-page/60 px-4 py-3"
          >
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted">
                {it.label}
              </span>
              <a
                href={it.href}
                target="_blank"
                rel="noreferrer"
                className="truncate text-sm text-ink/90 hover:text-accent"
              >
                {it.display}
              </a>
            </div>
            <a
              href={it.href}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent hover:bg-accent-soft/80"
            >
              Open ↗
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
