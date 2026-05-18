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
  size = "md",
}: {
  handle: string;
  displayName: string;
  // sm = 28px (nav chip); md = 56px (card header); lg = 80px (public hero).
  size?: "sm" | "md" | "lg";
}) {
  const [bg, fg] = colourFor(handle);
  const px = size === "lg" ? 80 : size === "sm" ? 28 : 56;
  const fontPx = size === "lg" ? 32 : size === "sm" ? 12 : 22;
  return (
    <div
      aria-hidden
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
      {initials(displayName)}
    </div>
  );
}
