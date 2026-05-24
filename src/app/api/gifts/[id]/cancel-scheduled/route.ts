import { NextResponse } from "next/server";

import { GIFT_CANCELLED_REASON } from "@/lib/booking/constants";
import { applyGiftCancelScheduled } from "@/lib/booking/submissions";
import { cancelGiftAlarm } from "@/lib/durable-objects/giftClaimSchedulerClient";

import { authorizeGiftPurchaser } from "../_lib/authorizeGiftPurchaser";
import { giftMutationGate } from "../_lib/giftMutationGate";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const auth = await authorizeGiftPurchaser(id);
  if (!auth.ok) return auth.response;
  const { submission } = auth;

  const gated = giftMutationGate(submission, { requireMethod: "scheduled" });
  if (gated) return gated;

  // Cancel the alarm first — cheap, idempotent, and removes the race window
  // where the DO fires between our SELECT and the WHERE-guarded UPDATE.
  await cancelGiftAlarm(id);

  const updated = await applyGiftCancelScheduled(id, {
    cancelledAtIso: new Date().toISOString(),
    by: submission.email,
    reason: GIFT_CANCELLED_REASON.purchaserRequest,
  });
  if (!updated) {
    return NextResponse.json({ error: "Already sent or cancelled" }, { status: 409 });
  }

  return NextResponse.json({ updated: true });
}
