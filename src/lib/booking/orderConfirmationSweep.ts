import { isDryRunRecipient } from "../resend";
import { recordEmailFailure } from "./emailFailures";
import { listPaidSubmissionsForEmail } from "./submissions";

export const ORDER_CONFIRMATION_GRACE_MS = 60 * 60 * 1000;
export const ORDER_CONFIRMATION_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

export async function flagMissingOrderConfirmations(nowMs = Date.now()): Promise<number> {
  const candidates = await listPaidSubmissionsForEmail("order_confirmation", {
    paidAfter: new Date(nowMs - ORDER_CONFIRMATION_LOOKBACK_MS).toISOString(),
    paidBefore: new Date(nowMs - ORDER_CONFIRMATION_GRACE_MS).toISOString(),
    withoutFailureOf: "order_confirmation",
  });
  const unsent = candidates.filter((submission) => !isDryRunRecipient(submission.email));
  for (const submission of unsent) {
    await recordEmailFailure(submission._id, {
      emailType: "order_confirmation",
      kind: "unrecorded",
      recipient: submission.email,
      attemptedAt: submission.paidAt ?? null,
    });
  }
  return unsent.length;
}
