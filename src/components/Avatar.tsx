"use client";

import { useState } from "react";

// Placeholder avatar for v0.7. No real upload UI yet — the storage bucket
// + RLS + image-resize chain is Phase 2 work. For now we render a circular
// chip with one or two initials derived from the display name, in a colour
// that's stable per handle (so the same person always gets the same chip
// across visits / pages — gives the card a face without a database write).
//
// When real upload lands, this becomes the fallback path when `src` is null.

const PALETTE: ReadonlyArray<readonly [string, string]> = [
  ["#b5563a", "#fff7ef"], // terracotta on cream
  ["#7a5a37", "#fff5e8"], // walnut on cream
  ["#3a6a78", "#eef5f7"], // teal on near-white
  ["#5a7a45", "#f1f6ed"], // olive on near-white
  ["#7a4a78", "#f6eef6"], // plum on near-white
  ["#9a5a30", "#fff1e2"], // burnt orange
];

function colourFor(handle: string): readonly [string, string] {
  // Fast deterministic hash. Don't need crypto strength; just stable.
  let h = 0;
  for (let i = 0; i < handle.length; i++) {
    h = (h * 31 + handle.charCodeAt(i)) >>> 0;
  }
  return PALETTE[h % PALETTE.length];
}

function initials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  handle,
  displayName,
  src,
  size = "md",
}: {
  handle: string;
  displayName: string;
  // Optional uploaded photo. Falls back to the initials chip if missing
  // or if the URL fails to load.
  src?: string | null;
  // sm = 28px (nav chip); md = 56px (card header); lg = 80px (public hero).
  size?: "sm" | "md" | "lg";
}) {
  const [bg, fg] = colourFor(handle);
  const px = size === "lg" ? 80 : size === "sm" ? 28 : 56;
  const fontPx = size === "lg" ? 32 : size === "sm" ? 12 : 22;

  // Track load failures so a dead photo URL (deleted object, hotlink
  // block, image host down) falls back to the initials chip instead of
  // leaving the browser's broken-image glyph on a public card. We store
  // the failed URL (not a bare boolean) so swapping `src` to a new value
  // — e.g. while editing the photo in LiveCardPreview — retries cleanly
  // instead of staying stuck on the fallback.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (src && failedSrc !== src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={`${displayName}'s avatar`}
        width={px}
        height={px}
        onError={() => setFailedSrc(src)}
        className="shrink-0 select-none rounded-full object-cover"
        style={{ width: px, height: px, backgroundColor: bg }}
      />
    );
  }

  return (
    // role="img" + aria-label so the initials chip reads as the person's
    // avatar to a screen reader, matching the alt text on the photo path.
    // The visible initials stay aria-hidden — they're decorative once the
    // label carries the name.
    <div
      role="img"
      aria-label={`${displayName}'s avatar`}
      className="inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold tracking-tight"
      style={{
        width: px,
        height: px,
        backgroundColor: bg,
        color: fg,
        fontSize: fontPx,
        lineHeight: 1,
      }}
    >
      <span aria-hidden>{initials(displayName)}</span>
    </div>
  );
}
