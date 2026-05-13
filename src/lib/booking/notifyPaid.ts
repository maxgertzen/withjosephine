import "server-only";

import { getOrCreateUser } from "../auth/users";
import { sendNotificationToJosephine, sendOrderConfirmation } from "../resend";
import {
  appendEmailFired,
  buildSubmissionContext,
  type FinancialMirror,
  markSubmissionPaid,
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

  // Build the email context once — needed for both user-name extraction
  // (firstName) and the actual email fan-out below.
  const context = buildSubmissionContext({
    ...submission,
    status: "paid",
    paidAt: details.paidAt,
    stripeEventId: details.stripeEventId,
    stripeSessionId: details.stripeSessionId,
    amountPaidCents: details.amountPaidCents,
    amountPaidCurrency: details.amountPaidCurrency,
  });

  // Identity: same email = same user. Resolved BEFORE the paid UPDATE so
  // recipient_user_id rides the same statement (markSubmissionPaid's
  // single UPDATE writes paid_at + status + recipient_user_id together) —
  // closes the observable `paid AND recipient_user_id IS NULL` window
  // that day-7 cron / Sanity mirror could previously witness.
  let recipientUserId: string | null = null;
  try {
    const { userId } = await getOrCreateUser({ email: submission.email, name: context.firstName });
    recipientUserId = userId;
  } catch (error) {
    console.error(`[notifyPaid] user-create failed for ${submission._id}`, error);
  }

  // Tax-retention record (6yr HMRC) — separable from reading content (3yr)
  // so Phase 4 cascade can scrub PII without breaching record-keeping.
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

  await Promise.all([
    sendNotificationToJosephine(context).catch((error) => {
      console.error(`[notifyPaid] Josephine email failed for ${submission._id}`, error);
    }),
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
  ]);

  return "applied";
}
