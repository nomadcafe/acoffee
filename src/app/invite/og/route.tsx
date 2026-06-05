import { ImageResponse } from "next/og";
import { DEFAULT_LOCALE, isLocale, t, tmpl, type Locale } from "@/lib/i18n/dict";
import { parseInviteParams } from "@/lib/invite-link";
import type { CoffeeChatKind } from "@/lib/types";

// Dynamic OG image for a shared /invite link — the artefact that lives in
// the social/chat unfurl preview. When someone pastes their invitation URL
// into Telegram / X / WhatsApp, this 1200×630 PNG is what the recipient
// sees *before* they click, so it has to read as the invitation itself.
//
// A GET route handler rather than the `opengraph-image` convention, because
// the invitation lives in the query string and `opengraph-image` only
// receives route params. `lang` is read first so the image matches the page
// locale (the page pins it via generateMetadata); a cold scraper with no
// `lang` falls back to English.
//
// Edge runtime so it streams fast for cold shares. No Tailwind — next/og
// only supports inline `style`. Palette mirrors the /[handle] OG so the two
// share the same colour identity.

export const runtime = "edge";

const SIZE = { width: 1200, height: 630 };

const KIND_EMOJI: Record<CoffeeChatKind, string> = {
  coffee: "☕",
  cowork: "💻",
  dinner: "🍜",
  hike: "🥾",
  work_talk: "💼",
};

export function GET(req: Request): ImageResponse {
  const { searchParams } = new URL(req.url);
  const langRaw = searchParams.get("lang");
  const locale: Locale = isLocale(langRaw) ? langRaw : DEFAULT_LOCALE;
  const data = parseInviteParams(Object.fromEntries(searchParams));

  const headline = data.from
    ? tmpl(t(locale, "inviteLink.card.headlineFrom"), { from: data.from })
    : t(locale, "inviteLink.card.headlineAnon");

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
            fontSize: 24,
            color: "#7a6a5a",
            fontWeight: 500,
            letterSpacing: 0.3,
            marginBottom: 48,
          }}
        >
          <span>acoffee.com</span>
          <span style={{ color: "#b5563a", fontWeight: 600 }}>Coffee in bio</span>
        </div>

        {/* greeting (only when the invitee is named) */}
        {data.to ? (
          <div
            style={{
              display: "flex",
              fontSize: 30,
              color: "#7a6a5a",
              fontWeight: 500,
              marginBottom: 16,
            }}
          >
            {tmpl(t(locale, "inviteLink.card.greeting"), { name: data.to })}
          </div>
        ) : null}

        {/* headline — the grabber */}
        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: -1.5,
            color: "#2a1f18",
            maxWidth: 1056,
            marginBottom: 28,
          }}
        >
          ☕ {headline}
        </div>

        {/* meta row: city + kind */}
        {data.city || data.kind ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 30,
              color: "#7a6a5a",
              fontWeight: 500,
              marginBottom: 28,
            }}
          >
            {data.city ? <span>📍 {data.city}</span> : null}
            {data.kind ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 20px",
                  background: "#efe0d4",
                  color: "#b5563a",
                  borderRadius: 999,
                  fontSize: 26,
                  fontWeight: 600,
                }}
              >
                <span>{KIND_EMOJI[data.kind]}</span>
                {t(locale, `profile.kind.${data.kind}` as const)}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* topic pull-quote */}
        {data.topic ? (
          <div
            style={{
              display: "flex",
              fontSize: 40,
              fontStyle: "italic",
              lineHeight: 1.35,
              color: "#2a1f18",
              maxWidth: 1056,
            }}
          >
            “{data.topic}”
          </div>
        ) : null}

        {/* footer CTA pinned to the bottom */}
        <div
          style={{
            display: "flex",
            marginTop: "auto",
            fontSize: 26,
            color: "#b5563a",
            fontWeight: 600,
          }}
        >
          {t(locale, "inviteLink.card.cta")} →
        </div>
      </div>
    ),
    { ...SIZE },
  );
}
