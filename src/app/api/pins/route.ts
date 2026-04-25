import { NextResponse } from "next/server";
import { z } from "zod";
import { addPin, listPins } from "@/lib/store";

export const dynamic = "force-dynamic";

const PinInput = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  nickname: z.string().trim().max(40).optional(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const bboxParam = searchParams.get("bbox");
  let bbox: Parameters<typeof listPins>[0]["bbox"] = undefined;
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
  const { lat, lng, nickname } = parsed.data;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;
  const pin = await addPin({
    lat,
    lng,
    nickname: nickname && nickname.length > 0 ? nickname : null,
    ip,
  });
  return NextResponse.json({ pin });
}
