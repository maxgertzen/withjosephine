import "server-only";

import { getOrCreateUser } from "../auth/users";
import { sendNotificationToJosephine, sendOrderConfirmation } from "../resend";
import {
  appendEmailFired,
  buildSubmissionContext,
  type FinancialMirror,
  markSubmissionPaid,
  SUBMISSION_STATUS,
  type SubmissionRecord,
} from "./submissions";

export type PaidEventDetails = {
  stripeEventId: string;
  stripeSessionId: string;
  paidAt: string;
  amountPaidCents: number | null;
  amountPaidCurrency: string | null;
  country: string | null;
};

export type ApplyPaidResult = "applied" | "alreadyApplied";

export async function applyPaidEvent(
  submission: SubmissionRecord,
  details: PaidEventDetails,
): Promise<ApplyPaidResult> {
  if (submission.stripeEventId === details.stripeEventId) return "alreadyApplied";

  const context = buildSubmissionContext({
    ...submission,
    status: SUBMISSION_STATUS.paid,
    paidAt: details.paidAt,
    stripeEventId: details.stripeEventId,
    stripeSessionId: details.stripeSessionId,
    amountPaidCents: details.amountPaidCents,
    amountPaidCurrency: details.amountPaidCurrency,
  });

  // For gifts, submission.email is the PURCHASER — resolving it here and
  // writing to recipient_user_id breaks listen-page session linkage on
  // scheduled gifts (purchaser ≠ recipient → infinite magic-link loop).
  // Leave NULL; redeemGiftSubmission populates from recipient intake.
  // For non-gifts, fold the user-resolve into the same UPDATE as paid_at
  // + status so day-7 cron / Sanity mirror never witness the half state.
  let recipientUserId: string | null = null;
  if (!submission.isGift) {
    try {
      const { userId } = await getOrCreateUser({ email: submission.email, name: context.firstName });
      recipientUserId = userId;
    } catch (error) {
      console.error(`[notifyPaid] user-create failed for ${submission._id}`, error);
    }
  }

  // Tax-retention record (6yr HMRC) — separable from reading content (3yr)
  // so the cascade can scrub PII without breaching record-keeping.
  // Stripe always returns amount + currency on a paid checkout session;
  // the null-guard keeps the contract type-safe and skips the financial
  // row on the reconcile-cron path that synthesizes a stripeEventId.
  const financial: FinancialMirror | undefined =
    details.amountPaidCents != null && details.amountPaidCurrency != null
      ? {
          submissionId: submission._id,
          userId: recipientUserId,
          email: submission.email,
          paidAt: details.paidAt,
          amountPaidCents: details.amountPaidCents,
          amountPaidCurrency: details.amountPaidCurrency,
          country: details.country,
          stripeSessionId: details.stripeSessionId,
        }
      : undefined;

  await markSubmissionPaid(submission._id, { ...details, recipientUserId }, financial);

  const dispatches: Array<Promise<unknown>> = [
    sendNotificationToJosephine(context).catch((error) => {
      console.error(`[notifyPaid] Josephine email failed for ${submission._id}`, error);
    }),
  ];

  // Gift purchasers receive `gift_purchase_confirmation` from the webhook
  // handler; skipping here avoids duplicate sends.
  if (!submission.isGift) {
    dispatches.push(
      sendOrderConfirmation(context)
        .then(async (result) => {
          if (result.kind !== "sent") return;
          try {
            await appendEmailFired(submission._id, {
              type: "order_confirmation",
              sentAt: new Date().toISOString(),
              resendId: result.resendId,
            });
          } catch (error) {
            console.error(
              `[notifyPaid] emailsFired write failed for ${submission._id}`,
              error,
            );
          }
        })
        .catch((error) => {
          console.error(`[notifyPaid] Order confirmation failed for ${submission._id}`, error);
        }),
    );
  }

  await Promise.all(dispatches);

  return "applied";
}
