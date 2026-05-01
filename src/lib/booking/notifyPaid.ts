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

  await markSubmissionPaid(submission._id, details);

  const context = buildSubmissionContext({
    ...submission,
    status: "paid",
    paidAt: details.paidAt,
    stripeEventId: details.stripeEventId,
    stripeSessionId: details.stripeSessionId,
    amountPaidCents: details.amountPaidCents,
    amountPaidCurrency: details.amountPaidCurrency,
  });

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
