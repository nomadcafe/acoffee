import { NextResponse } from "next/server";
import { z } from "zod";
import { addSubscriber } from "@/lib/store";

export const dynamic = "force-dynamic";

const SubInput = z.object({
  email: z.email().max(254),
  city: z.string().trim().max(40).optional(),
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
  const result = await addSubscriber({
    email: parsed.data.email.toLowerCase(),
    city: parsed.data.city ?? null,
  });
  return NextResponse.json(result);
}
