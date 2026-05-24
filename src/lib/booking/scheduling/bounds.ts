/**
 * Single source of truth for the send-at bounds on flip-to-scheduled and
 * edit-recipient mutations.
 *
 * Floor: 15 minutes from "now" gives the DO alarm enough buffer to land
 * cleanly even if there's request-to-alarm latency or clock skew. (Initial
 * purchase has different semantics — purchasedAt = now there — and lives in
 * `api/booking/gift/route.ts` with its own permissive bounds.)
 *
 * Ceiling: 365 days from the moment of purchase (NOT from "now") so a long-
 * tail edit can never extend the schedule beyond a year of the original
 * commercial event. Anchoring to purchasedAt prevents the "1 year + 364 days"
 * drift you'd get if every edit reset the clock.
 */

export const SEND_AT_MIN_OFFSET_MS = 15 * 60 * 1000;
export const SEND_AT_MAX_DAYS = 365;

export const SEND_AT_BOUND_CODE = {
  tooSoon: "too_soon",
  tooFar: "too_far",
  invalid: "invalid",
} as const;

export type SendAtBoundCode = (typeof SEND_AT_BOUND_CODE)[keyof typeof SEND_AT_BOUND_CODE];

export type SendAtBoundsInput = {
  now: Date;
  purchasedAt: Date;
};

export type SendAtBoundsResult =
  | { ok: true; sendAtIso: string }
  | { ok: false; code: SendAtBoundCode };

function addDaysUtc(base: Date, days: number): Date {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function validateSendAtBounds(
  candidate: string,
  bounds: SendAtBoundsInput,
): SendAtBoundsResult {
  const sendAt = new Date(candidate);
  if (Number.isNaN(sendAt.getTime())) {
    return { ok: false, code: SEND_AT_BOUND_CODE.invalid };
  }
  const minMs = bounds.now.getTime() + SEND_AT_MIN_OFFSET_MS;
  const maxMs = addDaysUtc(bounds.purchasedAt, SEND_AT_MAX_DAYS).getTime();
  if (sendAt.getTime() < minMs) {
    return { ok: false, code: SEND_AT_BOUND_CODE.tooSoon };
  }
  if (sendAt.getTime() > maxMs) {
    return { ok: false, code: SEND_AT_BOUND_CODE.tooFar };
  }
  return { ok: true, sendAtIso: sendAt.toISOString() };
}

export const SEND_AT_BOUND_MESSAGE: Record<SendAtBoundCode, string> = {
  [SEND_AT_BOUND_CODE.invalid]: "Invalid date.",
  [SEND_AT_BOUND_CODE.tooSoon]: "Send-at must be at least 15 minutes from now.",
  [SEND_AT_BOUND_CODE.tooFar]: `Send-at must be within ${SEND_AT_MAX_DAYS} days of purchase.`,
};
