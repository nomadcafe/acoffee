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
            "radial-gradient(circle at 30% 20%, #064e3b 0%, #0a0a0a 70%)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 28,
            color: "#34d399",
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: 999,
              background: "#10b981",
              boxShadow: "0 0 0 6px rgba(16,185,129,0.25)",
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
          <div style={{ fontSize: 36, color: "#a1a1aa", maxWidth: 900 }}>
            Drop a pin. See who else just landed in your city.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 24,
            color: "#71717a",
          }}
        >
          <span>Launching in Chiang Mai first</span>
          <span>nomadmeetup</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
