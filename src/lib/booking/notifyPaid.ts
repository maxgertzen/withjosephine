import { sendClientConfirmation, sendNotificationToJosephine } from "../resend";
import {
  buildSubmissionContext,
  markSubmissionPaid,
  type SubmissionRecord,
} from "./submissions";

export type PaidEventDetails = {
  stripeEventId: string;
  stripeSessionId: string;
  paidAt: string;
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
  });

  await Promise.all([
    sendNotificationToJosephine(context).catch((error) => {
      console.error(`[notifyPaid] Josephine email failed for ${submission._id}`, error);
    }),
    sendClientConfirmation(context).catch((error) => {
      console.error(`[notifyPaid] Client email failed for ${submission._id}`, error);
    }),
  ]);

  return "applied";
}
