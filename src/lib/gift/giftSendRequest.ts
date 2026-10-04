import { NextResponse } from "next/server";

import { verifyGiftSendToken } from "@/lib/gift/giftCode";
import { checkGiftRateLimit } from "@/lib/gift/giftRateLimit";

export async function authorizeGiftSendRequest<Body extends { token: string }>(
  request: Request,
  parse: (body: unknown) => Body | null,
): Promise<{ giftId: string; body: Body } | Response> {
  const body = parse(await request.json().catch(() => null));
  const giftId = body ? await verifyGiftSendToken(body.token) : null;
  if (body && giftId) return { giftId, body };
  const withinLimit = await checkGiftRateLimit(request.headers);
  return new NextResponse(null, { status: withinLimit ? 404 : 429 });
}
