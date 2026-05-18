import { ImageResponse } from "next/og";
import { siteName } from "@/lib/site";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${siteName} — Coffee in bio`;

// Site-wide OG. Per-handle pages override this with `/[handle]/opengraph-image`
// so a shared Card URL gets the user's avatar + name + status instead of the
// generic site preview.
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
          background: "#f4ede1",
          color: "#2a1f18",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 26,
            fontWeight: 600,
            color: "#b5563a",
            letterSpacing: 0.5,
          }}
        >
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: 999,
              background: "#b5563a",
            }}
          />
          acoffee
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              fontSize: 152,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: -3,
              maxWidth: 1056,
            }}
          >
            Coffee in bio.
          </div>
          <div
            style={{
              fontSize: 36,
              color: "#7a6a5a",
              maxWidth: 980,
              lineHeight: 1.35,
            }}
          >
            Your friendly coffee chat page. Share your link once — get
            invited for coffee, online or in person.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 24,
            color: "#7a6a5a",
            fontWeight: 500,
          }}
        >
          <span>acoffee.com/{`{handle}`}</span>
          <span>Open beta · Chiang Mai</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
