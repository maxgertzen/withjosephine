import { NextResponse } from "next/server";

import { findGiftById } from "@/lib/gift/gifts";
import { giftSendStatus } from "@/lib/gift/giftSend";
import { parseGiftSendStatusRequest } from "@/lib/gift/giftSendContract";
import {
  authorizeGiftSendToken,
  rejectInvalidBody,
  rejectInvalidSendLink,
} from "@/lib/gift/giftSendRequest";

export async function POST(request: Request): Promise<Response> {
  const authorized = await authorizeGiftSendToken(request, parseGiftSendStatusRequest, {
    onBadBody: rejectInvalidBody,
    onInvalidLink: rejectInvalidSendLink(request, 200),
  });
  if (authorized instanceof Response) return authorized;

  return NextResponse.json(giftSendStatus(await findGiftById(authorized.giftId)));
}
