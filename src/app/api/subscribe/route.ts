import { NextResponse } from "next/server";
import { z } from "zod";
import { addSubscriber } from "@/lib/store";
import { checkRateLimit, ipFromHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const HOUR = 60 * 60 * 1000;

const SubInput = z.object({
  email: z.email().max(254),
  city: z.string().trim().max(40).optional(),
  website: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = SubInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }
  // Honeypot tripped: pretend success.
  if (parsed.data.website && parsed.data.website.length > 0) {
    return NextResponse.json({ ok: true, duplicate: false });
  }

  const ip = ipFromHeaders(req.headers);
  const limit = checkRateLimit(`subscribe:${ip}`, [
    { windowMs: HOUR, max: 5 },
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

  const result = await addSubscriber({
    email: parsed.data.email.toLowerCase(),
    city: parsed.data.city ?? null,
  });
  return NextResponse.json(result);
}
