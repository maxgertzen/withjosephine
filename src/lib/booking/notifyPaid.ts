import "server-only";

import { getOrCreateUser } from "../auth/users";
import { sendNotificationToJosephine, sendOrderConfirmation } from "../resend";
import {
  appendEmailFired,
  buildSubmissionContext,
  markSubmissionPaid,
  type SubmissionRecord,
} from "./submissions";

export type PaidEventDetails = {
  stripeEventId: string;
  stripeSessionId: string;
  paidAt: string;
  amountPaidCents: number | null;
  amountPaidCurrency: string | null;
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

  await markSubmissionPaid(submission._id, { ...details, recipientUserId });

  await Promise.all([
    sendNotificationToJosephine(context).catch((error) => {
      console.error(`[notifyPaid] Josephine email failed for ${submission._id}`, error);
    }),
    sendOrderConfirmation(context)
      .then(async (result) => {
        if (!result.resendId) return;
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
