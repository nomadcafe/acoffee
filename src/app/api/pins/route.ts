import { NextResponse } from "next/server";
import { z } from "zod";
import { addPin, listPins, type Bbox } from "@/lib/store";
import { checkRateLimit, ipFromHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const PinInput = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  nickname: z.string().trim().max(40).optional(),
  // Honeypot: real users never fill this; bots scraping the form do.
  // Field name "website" because that's what most form spam expects.
  website: z.string().max(200).optional(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const bboxParam = searchParams.get("bbox");
  let bbox: Bbox | undefined = undefined;
  if (bboxParam) {
    const parts = bboxParam.split(",").map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      const [minLat, minLng, maxLat, maxLng] = parts;
      bbox = { minLat, minLng, maxLat, maxLng };
    } else {
      return NextResponse.json(
        { error: "bbox must be minLat,minLng,maxLat,maxLng" },
        { status: 400 },
      );
    }
  }
  const pins = await listPins({ bbox });
  return NextResponse.json({ pins });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = PinInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }
  const { lat, lng, nickname, website } = parsed.data;

  // Honeypot tripped: silently succeed with a fake pin so the bot can't
  // distinguish real submissions from blocks. Nothing is persisted.
  if (website && website.length > 0) {
    return NextResponse.json({
      pin: {
        id: "00000000-0000-0000-0000-000000000000",
        lat,
        lng,
        nickname: null,
        createdAt: new Date().toISOString(),
      },
    });
  }

  const ip = ipFromHeaders(req.headers);
  const limit = checkRateLimit(`pins:${ip}`, [
    { windowMs: HOUR, max: 1 },
    { windowMs: DAY, max: 3 },
  ]);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate limit exceeded" },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSec) },
      },
    );
  }

  const pin = await addPin({
    lat,
    lng,
    nickname: nickname && nickname.length > 0 ? nickname : null,
    ip,
  });
  return NextResponse.json({ pin });
}
