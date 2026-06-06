import { GIFT_DELIVERY } from "@/lib/booking/constants";
import { giftResendRateLimit } from "@/lib/booking/giftStatus";
import type { SubmissionRecord } from "@/lib/page-previews/types";

import type { GiftCardData, ResendVerdictSummary } from "./GiftCardActions";

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

export function computeResendVerdict(
  gift: SubmissionRecord,
  nowMs: number = Date.now(),
): ResendVerdictSummary | undefined {
  if (gift.giftDeliveryMethod !== GIFT_DELIVERY.selfSend) return undefined;
  const verdict = giftResendRateLimit(gift.emailsFired, nowMs);
  if (verdict.allowed) return { allowed: true };
  const resendsMs = (gift.emailsFired ?? [])
    .filter((e) => e.type === "gift_resend")
    .map((e) => Date.parse(e.sentAt))
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);
  const windowMs = verdict.reason === "hour_cap" ? ONE_HOUR_MS : ONE_DAY_MS;
  const oldestInWindow = resendsMs.find((t) => nowMs - t < windowMs) ?? nowMs;
  const nextAvailableAt = new Date(oldestInWindow + windowMs).toISOString();
  return { allowed: false, reason: verdict.reason, nextAvailableAt };
}

/**
 * Drops purchaser email + financial fields + stripe ids so they never enter
 * the React tree of the client component. Pre-computed `resendVerdict`
 * exposes only the verdict the UI needs without leaking raw `emailsFired`
 * entries (which carry Resend message IDs).
 */
export function toGiftCardData(
  gift: SubmissionRecord,
  nowMs: number = Date.now(),
): GiftCardData {
  return {
    _id: gift._id,
    responses: gift.responses,
    recipientEmail: gift.recipientEmail,
    giftSendAt: gift.giftSendAt,
    resendVerdict: computeResendVerdict(gift, nowMs),
  };
}
