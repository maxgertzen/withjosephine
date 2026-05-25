import type { EmailFiredEntry, SubmissionRecord } from "@/lib/page-previews/types";

import { GIFT_DELIVERY, GIFT_STATUS_KIND } from "./constants";

/**
 * Discriminated union summarising what a purchaser should see on
 * `/my-gifts` for a single gift submission. Pure function — page
 * rendering, test cases, and the route gates all share it as
 * the single source of truth.
 *
 * Intentionally does NOT include any "listened" state: listening is
 * private to the recipient.
 */
export type GiftStatus =
  | { kind: typeof GIFT_STATUS_KIND.scheduled; sendAt: string }
  | { kind: typeof GIFT_STATUS_KIND.selfSendReady; firedAt: string | null }
  | { kind: typeof GIFT_STATUS_KIND.sentWaitingRecipient; firedAt: string }
  | { kind: typeof GIFT_STATUS_KIND.recipientPreparing; claimedAt: string }
  | { kind: typeof GIFT_STATUS_KIND.delivered; deliveredAt: string }
  | { kind: typeof GIFT_STATUS_KIND.cancelled; cancelledAt: string };

export function giftStatusFor(record: SubmissionRecord): GiftStatus {
  if (record.giftCancelledAt) {
    return { kind: GIFT_STATUS_KIND.cancelled, cancelledAt: record.giftCancelledAt };
  }
  if (record.deliveredAt) {
    return { kind: GIFT_STATUS_KIND.delivered, deliveredAt: record.deliveredAt };
  }
  if (record.giftClaimedAt) {
    return { kind: GIFT_STATUS_KIND.recipientPreparing, claimedAt: record.giftClaimedAt };
  }
  if (record.giftDeliveryMethod === GIFT_DELIVERY.selfSend) {
    return { kind: GIFT_STATUS_KIND.selfSendReady, firedAt: record.giftClaimEmailFiredAt };
  }
  if (record.giftClaimEmailFiredAt) {
    return {
      kind: GIFT_STATUS_KIND.sentWaitingRecipient,
      firedAt: record.giftClaimEmailFiredAt,
    };
  }
  return {
    kind: GIFT_STATUS_KIND.scheduled,
    sendAt: record.giftSendAt ?? record.createdAt,
  };
}

// Piggybacks on `emails_fired_json` (no new column); arrays are short
// by design so the JSON-walk cost is trivial.
export type ResendRateLimitVerdict =
  | { allowed: true }
  | { allowed: false; reason: "hour_cap" | "day_cap" };

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

export function giftResendRateLimit(
  emailsFired: EmailFiredEntry[] | undefined,
  nowMs: number,
): ResendRateLimitVerdict {
  if (!emailsFired || emailsFired.length === 0) return { allowed: true };
  let inHour = 0;
  let inDay = 0;
  for (const entry of emailsFired) {
    if (entry.type !== "gift_resend") continue;
    const sent = Date.parse(entry.sentAt);
    if (!Number.isFinite(sent)) continue;
    const age = nowMs - sent;
    if (age < ONE_HOUR_MS) inHour += 1;
    if (age < ONE_DAY_MS) inDay += 1;
  }
  if (inHour >= 1) return { allowed: false, reason: "hour_cap" };
  if (inDay >= 3) return { allowed: false, reason: "day_cap" };
  return { allowed: true };
}
