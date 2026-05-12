/**
 * Gift-claim email dispatcher.
 *
 * **Logging discipline (Phase 5 Session 4b — B5.19):** if you add a
 * `console.*` to this file, log only `submissionId`. No raw emails, no
 * Resend message IDs, no token material, no recipient/purchaser names.
 * `wrangler tail` is shared with the team; treat logs as public-readable.
 */
import { issueGiftClaimToken } from "@/lib/booking/giftClaim";
import { sendGiftClaimEmail } from "@/lib/resend";

import { purchaserFirstNameFor, recipientNameFor } from "./giftPersonas";
import { sendAndRecord } from "./sendAndRecord";
import { findSubmissionById, markGiftClaimSent } from "./submissions";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_RETRIES = 3;

export type GiftClaimDispatchOutcome =
  | { outcome: "first_send"; nextAlarmMs: number }
  | { outcome: "reminder"; nextAlarmMs: number }
  | {
      outcome: "stop";
      reason: "missing" | "claimed" | "cancelled" | "abandoned" | "max_retries" | "not_scheduled";
      nextAlarmMs: null;
    };

export type GiftClaimDispatchInput = {
  submissionId: string;
  retryCount: number;
  nowMs: number;
};

/**
 * Pure async dispatcher. Reads D1 + sends via Resend. Decides the next
 * alarm timestamp the caller (DO `alarm()`) should set, or null to stop.
 *
 * Idempotency: re-firing the same alarm against unchanged D1 state lands in
 * the same outcome — claimed/cancelled/abandoned all return `stop`; the
 * first-send path only fires when `gift_claim_email_fired_at IS NULL`.
 *
 * Resend failure (`resendId === null`, e.g. RESEND_DRY_RUN or missing key)
 * does NOT mark the email fired AND does NOT append `emails_fired_json`,
 * so the next alarm cycle retries from the same state.
 */
export async function dispatchGiftClaim(
  input: GiftClaimDispatchInput,
): Promise<GiftClaimDispatchOutcome> {
  const submission = await findSubmissionById(input.submissionId);
  if (!submission) {
    return { outcome: "stop", reason: "missing", nextAlarmMs: null };
  }
  if (!submission.isGift || submission.giftDeliveryMethod !== "scheduled") {
    return { outcome: "stop", reason: "not_scheduled", nextAlarmMs: null };
  }
  if (submission.giftClaimedAt) {
    return { outcome: "stop", reason: "claimed", nextAlarmMs: null };
  }
  if (submission.giftCancelledAt) {
    return { outcome: "stop", reason: "cancelled", nextAlarmMs: null };
  }

  const recipientEmail = submission.recipientEmail;
  if (!recipientEmail) {
    return { outcome: "stop", reason: "missing", nextAlarmMs: null };
  }

  const isFirstSend = !submission.giftClaimEmailFiredAt;

  if (!isFirstSend) {
    const firstSendMs = Date.parse(submission.giftClaimEmailFiredAt ?? "");
    if (!Number.isNaN(firstSendMs) && input.nowMs - firstSendMs >= THIRTY_DAYS_MS) {
      return { outcome: "stop", reason: "abandoned", nextAlarmMs: null };
    }
    if (input.retryCount >= MAX_RETRIES) {
      return { outcome: "stop", reason: "max_retries", nextAlarmMs: null };
    }
  }

  const purchaserFirstName = purchaserFirstNameFor(submission);
  const recipientName = recipientNameFor(submission);
  const readingName = submission.reading?.name ?? "reading";
  const giftMessage = submission.giftMessage ?? null;
  const nowIso = new Date(input.nowMs).toISOString();

  if (isFirstSend) {
    const { tokenHash, claimUrl } = await issueGiftClaimToken();
    // Side-effecting send path: markGiftClaimSent must AND-pair with the
    // emails_fired entry, so the helper's standard append-on-success
    // wrapping isn't quite enough — we keep both calls inside the same
    // `if (resendId)` block. sendAndRecord still owns the append.
    const sendResult = await sendAndRecord({
      submissionId: submission._id,
      type: "gift_claim",
      nowIso,
      send: () =>
        sendGiftClaimEmail({
          submissionId: submission._id,
          recipientEmail,
          recipientName,
          purchaserFirstName,
          readingName,
          giftMessage,
          variant: "first_send",
          claimUrl,
        }),
    });
    if (sendResult.appended) {
      await markGiftClaimSent(submission._id, tokenHash, nowIso);
    }
    return { outcome: "first_send", nextAlarmMs: input.nowMs + SEVEN_DAYS_MS };
  }

  await sendAndRecord({
    submissionId: submission._id,
    type: "gift_claim",
    nowIso,
    send: () =>
      sendGiftClaimEmail({
        submissionId: submission._id,
        recipientEmail,
        recipientName,
        purchaserFirstName,
        readingName,
        giftMessage,
        variant: "reminder",
      }),
  });
  return { outcome: "reminder", nextAlarmMs: input.nowMs + SEVEN_DAYS_MS };
}
