import { GIFT_DELIVERY } from "./constants";
import type { EmailFiredEntry, SubmissionRecord } from "./submissions";

/**
 * Discriminated union summarising what a purchaser should see on
 * `/my-gifts` for a single gift submission. Pure function — page
 * rendering, test cases, and the route gates all share it as
 * the single source of truth.
 *
 * Intentionally does NOT include any "listened" state: listening is
 * private to the recipient (Phase 5 ISC-A5 / ISC-A3).
 */
export type GiftStatus =
  | { kind: "scheduled"; sendAt: string }
  | { kind: "self_send_ready"; firedAt: string | null }
  | { kind: "sent_waiting_recipient"; firedAt: string }
  | { kind: "recipient_preparing"; claimedAt: string }
  | { kind: "delivered"; deliveredAt: string }
  | { kind: "cancelled"; cancelledAt: string };

export function giftStatusFor(record: SubmissionRecord): GiftStatus {
  if (record.giftCancelledAt) {
    return { kind: "cancelled", cancelledAt: record.giftCancelledAt };
  }
  if (record.deliveredAt) {
    return { kind: "delivered", deliveredAt: record.deliveredAt };
  }
  if (record.giftClaimedAt) {
    return { kind: "recipient_preparing", claimedAt: record.giftClaimedAt };
  }
  if (record.giftDeliveryMethod === GIFT_DELIVERY.selfSend) {
    return { kind: "self_send_ready", firedAt: record.giftClaimEmailFiredAt };
  }
  if (record.giftClaimEmailFiredAt) {
    return { kind: "sent_waiting_recipient", firedAt: record.giftClaimEmailFiredAt };
  }
  return {
    kind: "scheduled",
    sendAt: record.giftSendAt ?? record.createdAt,
  };
}

/**
 * Resend-link rate-limit predicate. Counts entries of type `gift_resend`
 * in `emailsFired` within the trailing windows and surfaces the verdict
 * the route uses to decide between 200 and 429.
 *
 * Reasoning lives in the PRD: piggybacking on `emails_fired_json`
 * keeps the schema flat (no new column), and the JSON-walk cost is
 * trivial — emails_fired arrays are short by design.
 */
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
