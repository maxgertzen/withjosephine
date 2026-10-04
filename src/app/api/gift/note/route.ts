import { NextResponse } from "next/server";

import { isFlagEnabled } from "@/lib/env";
import { parseGiftNoteRequest, validateGiftSheet } from "@/lib/gift/giftInput";
import { updateGiftNote } from "@/lib/gift/gifts";
import { authorizeGiftSendRequest } from "@/lib/gift/giftSendRequest";

export async function POST(request: Request): Promise<Response> {
  if (!isFlagEnabled("GIFTS_ENABLED")) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const authorized = await authorizeGiftSendRequest(request, parseGiftNoteRequest);
  if (authorized instanceof Response) return authorized;
  const { giftId, body } = authorized;

  const sheet = validateGiftSheet(body);
  if ("fieldErrors" in sheet) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: sheet.fieldErrors },
      { status: 400 },
    );
  }

  const updated = await updateGiftNote(giftId, {
    ...sheet.values,
    updatedAt: new Date().toISOString(),
  });
  if (!updated) {
    return NextResponse.json({ error: "not_active" }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
