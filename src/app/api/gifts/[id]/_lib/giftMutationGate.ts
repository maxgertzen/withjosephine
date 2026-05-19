import { NextResponse } from "next/server";

import { GIFT_DELIVERY } from "@/lib/booking/constants";
import type { SubmissionRecord } from "@/lib/booking/submissions";

/**
 * Stable 409 reason strings for gift-mutation preflight failures. Exported
 * as constants so route tests, e2e specs, and audit logs can reference
 * exact strings without copy-paste drift.
 */
export const GIFT_GATE_409 = {
  notScheduled: "Not in scheduled mode",
  notSelfSend: "Already in scheduled mode",
  alarmAlreadyFired: "Email already sent by alarm",
  sentNow: "Already sent via send-now",
  cancelled: "Already cancelled",
  claimed: "Already claimed",
} as const;

export type GiftGateOptions = {
  requireMethod: "scheduled" | "selfSend";
  /** Defaults to true. cancel-auto-send opts out (it relies on the atomic flip). */
  checkSentNow?: boolean;
  /** Defaults to true. flip-to-scheduled opts out (no alarm exists in self_send mode). */
  checkAlarmFired?: boolean;
};

/**
 * Shared preflight ladder for the 4 gift-mutation routes (`send-now`,
 * `cancel-scheduled`, `cancel-auto-send`, `flip-to-scheduled`). Returns a
 * 409 `NextResponse` when any blocking condition is set, or `null` when
 * the row is in a state that permits the mutation.
 *
 * The atomic WHERE-guarded UPDATE in each route remains the real
 * race-stop — this gate is for audit clarity (distinguishable 409 strings)
 * and dead-state short-circuits (saves a SQL roundtrip when we already
 * know the row is closed). Per-route adoption is preceded by a manual
 * audit of pre-gate side effects; none of the 4 routes do anything
 * between auth and this gate today.
 */
export function giftMutationGate(
  submission: Pick<
    SubmissionRecord,
    | "giftDeliveryMethod"
    | "giftCancelledAt"
    | "giftClaimedAt"
    | "giftClaimEmailFiredAt"
    | "giftClaimSentNowAt"
  >,
  opts: GiftGateOptions,
): NextResponse | null {
  const { requireMethod, checkSentNow = true, checkAlarmFired = true } = opts;

  if (requireMethod === "scheduled" && submission.giftDeliveryMethod !== GIFT_DELIVERY.scheduled) {
    return NextResponse.json({ error: GIFT_GATE_409.notScheduled }, { status: 409 });
  }
  if (requireMethod === "selfSend" && submission.giftDeliveryMethod !== GIFT_DELIVERY.selfSend) {
    return NextResponse.json({ error: GIFT_GATE_409.notSelfSend }, { status: 409 });
  }
  if (submission.giftCancelledAt) {
    return NextResponse.json({ error: GIFT_GATE_409.cancelled }, { status: 409 });
  }
  if (submission.giftClaimedAt) {
    return NextResponse.json({ error: GIFT_GATE_409.claimed }, { status: 409 });
  }
  if (checkAlarmFired && submission.giftClaimEmailFiredAt) {
    return NextResponse.json({ error: GIFT_GATE_409.alarmAlreadyFired }, { status: 409 });
  }
  if (checkSentNow && submission.giftClaimSentNowAt) {
    return NextResponse.json({ error: GIFT_GATE_409.sentNow }, { status: 409 });
  }
  return null;
}
