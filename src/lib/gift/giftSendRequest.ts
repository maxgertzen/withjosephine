import { NextResponse } from "next/server";

import { AUDIT_EVENT_TYPE } from "@/lib/audit/eventTypes";
import { auditInvalidGiftLink } from "@/lib/gift/giftAudit";
import { verifyGiftSendToken } from "@/lib/gift/giftCode";
import { checkGiftRateLimit } from "@/lib/gift/giftRateLimit";

type GiftSendAuthorization<Body> = { giftId: string; body: Body } | Response;

type BodyParser<Body> = (body: unknown) => Body | null;

export type GiftSendRejection = (withinRateLimit: () => Promise<boolean>) => Promise<Response>;

export type GiftSendRejections = {
  onBadBody: GiftSendRejection;
  onInvalidLink: GiftSendRejection;
};

export async function authorizeGiftSendToken<Body extends { token: string }>(
  request: Request,
  parse: BodyParser<Body>,
  { onBadBody, onInvalidLink }: GiftSendRejections,
): Promise<GiftSendAuthorization<Body>> {
  const withinRateLimit = () => checkGiftRateLimit(request.headers);
  const body = parse(await request.json().catch(() => null));
  if (!body) return onBadBody(withinRateLimit);
  const giftId = await verifyGiftSendToken(body.token);
  return giftId ? { giftId, body } : onInvalidLink(withinRateLimit);
}

export async function rejectInvalidBody(): Promise<Response> {
  return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
}

export function rejectInvalidSendLink(request: Request, status: 200 | 404): GiftSendRejection {
  return async (withinRateLimit) => {
    if (!(await withinRateLimit())) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    await auditInvalidGiftLink(request, AUDIT_EVENT_TYPE.gift_send_link_invalid);
    return NextResponse.json({ state: "invalid" }, { status });
  };
}
