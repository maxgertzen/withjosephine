import { NextResponse } from "next/server";

import { isFlagEnabled } from "@/lib/env";
import { findGiftById } from "@/lib/gift/gifts";
import { giftSendStatus } from "@/lib/gift/giftSend";
import { parseGiftSendStatusRequest } from "@/lib/gift/giftSendContract";
import {
  authorizeGiftSendToken,
  rejectInvalidBody,
  rejectInvalidSendLink,
} from "@/lib/gift/giftSendRequest";

export async function POST(request: Request): Promise<Response> {
  if (!isFlagEnabled("GIFTS_ENABLED")) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const authorized = await authorizeGiftSendToken(request, parseGiftSendStatusRequest, {
    onBadBody: rejectInvalidBody,
    onInvalidLink: rejectInvalidSendLink(request, 200),
  });
  if (authorized instanceof Response) return authorized;

  return NextResponse.json(giftSendStatus(await findGiftById(authorized.giftId)));
}
