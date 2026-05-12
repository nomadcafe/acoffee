import { ImageResponse } from "next/og";
import { siteName, siteTagline } from "@/lib/site";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${siteName} — ${siteTagline}`;

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background:
            "radial-gradient(circle at 30% 20%, #3a2418 0%, #0c0807 70%)",
          color: "#faf6f1",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 28,
            color: "#d4a574",
            letterSpacing: 2,
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: 999,
              background: "#b8763d",
              boxShadow: "0 0 0 6px rgba(184,118,61,0.25)",
            }}
          />
          {siteName}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 980,
            }}
          >
            {siteTagline}
          </div>
          <div style={{ fontSize: 36, color: "#a8a29e", maxWidth: 900 }}>
            Drop a pin. See who else just landed in your city.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 24,
            color: "#78716c",
          }}
        >
          <span>Launching in Chiang Mai first</span>
          <span>acoffee.com</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
