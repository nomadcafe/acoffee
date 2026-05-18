import { ImageResponse } from "next/og";
import { createSupabaseServer, isAuthConfigured } from "@/lib/supabase/server";
import { COFFEE_CHAT_KINDS, type CoffeeChatKind } from "@/lib/types";

// Dynamic OG image for /[handle] — the artefact that lives in social share
// previews. Each shared Card URL renders a 1200×630 PNG with the user's
// avatar (initials chip, same palette as the in-app Avatar), display name,
// city, status, and chat-kind chips.
//
// Edge runtime so it streams fast for cold shares. No Tailwind here —
// next/og only supports inline `style` objects. Layout mirrors <CardBody>
// at a higher fidelity so the social preview *is* the card, not a
// stylised remake of it.

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Mirrors the in-app Avatar palette so the OG and the live card share the
// same colour identity per handle.
const PALETTE: ReadonlyArray<readonly [string, string]> = [
  ["#b5563a", "#fff7ef"],
  ["#7a5a37", "#fff5e8"],
  ["#3a6a78", "#eef5f7"],
  ["#5a7a45", "#f1f6ed"],
  ["#7a4a78", "#f6eef6"],
  ["#9a5a30", "#fff1e2"],
];

const KIND_META: Record<CoffeeChatKind, { emoji: string; label: string }> = {
  coffee: { emoji: "☕", label: "Coffee" },
  cowork: { emoji: "💻", label: "Cowork" },
  dinner: { emoji: "🍜", label: "Dinner" },
  hike: { emoji: "🥾", label: "Hike" },
  work_talk: { emoji: "💼", label: "Work talk" },
};

function colourFor(handle: string): readonly [string, string] {
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

function deriveDisplayName(handle: string): string {
  return handle
    .split("_")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function parseChatKinds(raw: unknown): CoffeeChatKind[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set<string>(COFFEE_CHAT_KINDS);
  return raw.filter(
    (v): v is CoffeeChatKind => typeof v === "string" && allowed.has(v),
  );
}

type CardForOg = {
  handle: string;
  displayName: string;
  city: string | null;
  status: string | null;
  kinds: CoffeeChatKind[];
};

async function fetchCard(handle: string): Promise<CardForOg | null> {
  if (!isAuthConfigured()) return null;
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("profiles")
    .select("handle, bio, city, coffee_chat_kinds")
    .eq("handle", handle.toLowerCase())
    .maybeSingle();
  if (!data) return null;
  const rawHandle = data.handle as string;
  return {
    handle: rawHandle,
    displayName: deriveDisplayName(rawHandle),
    city: (data.city as string | null) ?? null,
    status: (data.bio as string | null) ?? null,
    kinds: parseChatKinds(data.coffee_chat_kinds),
  };
}

export const alt = "acoffee — coffee chat card";

export default async function CardOg({
  params,
}: {
  params: { handle: string };
}) {
  const card = await fetchCard(params.handle);
  if (!card) {
    // No profile → render the generic site OG so social previews don't
    // 404 mid-share. Same palette as the live card so the difference is
    // not jarring if someone shares a stale URL.
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f4ede1",
            color: "#2a1f18",
            fontFamily: "system-ui, sans-serif",
            fontSize: 64,
            fontWeight: 600,
          }}
        >
          Card not found · acoffee
        </div>
      ),
      { ...size },
    );
  }

  const [avatarBg, avatarFg] = colourFor(card.handle);
  // Long status lines wrap awkwardly at 56px font; cap at ~160 chars
  // (DB max is 140, but allow some leeway and trust the CHECK constraint).
  const status = card.status?.slice(0, 200) ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: 72,
          background: "#f4ede1",
          color: "#2a1f18",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* masthead */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            color: "#7a6a5a",
            fontWeight: 500,
            letterSpacing: 0.3,
            marginBottom: 56,
          }}
        >
          <span>acoffee.com/{card.handle}</span>
          <span style={{ color: "#b5563a", fontWeight: 600 }}>Coffee in bio</span>
        </div>

        {/* name + avatar row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              width: 144,
              height: 144,
              borderRadius: 999,
              background: avatarBg,
              color: avatarFg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: -1,
            }}
          >
            {initials(card.displayName)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                fontSize: 96,
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: -2,
                color: "#2a1f18",
              }}
            >
              {card.displayName}
            </div>
            <div
              style={{
                fontSize: 28,
                color: "#7a6a5a",
                fontWeight: 500,
              }}
            >
              @{card.handle}
              {card.city ? ` · ${card.city}` : ""}
            </div>
          </div>
        </div>

        {/* status — the social-share grabber */}
        {status && (
          <div
            style={{
              fontSize: 44,
              lineHeight: 1.3,
              color: "#2a1f18",
              maxWidth: 1056,
              marginBottom: 36,
              fontWeight: 400,
            }}
          >
            “{status}”
          </div>
        )}

        {/* kind chips */}
        {card.kinds.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginTop: "auto",
              marginBottom: 12,
            }}
          >
            {card.kinds.map((k) => {
              const m = KIND_META[k];
              return (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 20px",
                    background: "#efe0d4",
                    color: "#b5563a",
                    borderRadius: 999,
                    fontSize: 22,
                    fontWeight: 600,
                    letterSpacing: 0.3,
                  }}
                >
                  <span>{m.emoji}</span>
                  {m.label}
                </div>
              );
            })}
          </div>
        )}
      </div>
    ),
    { ...size },
  );
}
