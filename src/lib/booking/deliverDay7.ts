import { mintListenToken } from "@/lib/auth/listenToken";
import { findDay7Entry } from "@/lib/booking/day7Entry";
import {
  type DeliverableSubmission,
  fetchDeliverableSubmissions,
} from "@/lib/booking/persistence/sanityDelivery";
import {
  buildSubmissionContext,
  findSubmissionById,
  markSubmissionDeliveredIfUnset,
  recordDay7Sent,
  type SubmissionRecord,
} from "@/lib/booking/submissions";
import { siteOrigin } from "@/lib/env";
import { sendDay7Delivery } from "@/lib/resend";

type DeliverOneOutcome = "sent" | "alreadySent" | "dryRun" | "skipped";

export type DeliverOutcome = DeliverOneOutcome | "awaitingAssets" | "notFound";

export async function deliverOne(
  d1Submission: SubmissionRecord,
  resolved: DeliverableSubmission,
): Promise<DeliverOneOutcome> {
  if (d1Submission.status !== "paid" || d1Submission.isLegacyGift) return "skipped";
  if (findDay7Entry(d1Submission.emailsFired)) return "alreadySent";

  if (!d1Submission.recipientUserId) {
    console.error(
      `[cron-day-7] missing recipientUserId for ${d1Submission._id}, cannot mint token`,
    );
    return "skipped";
  }

  const token = await mintListenToken({
    submissionId: d1Submission._id,
    recipientUserId: d1Submission.recipientUserId,
    mintSource: "cron_day7",
  });
  const listenUrl = `${siteOrigin()}/listen/${d1Submission._id}?t=${token}`;
  const sendResult = await sendDay7Delivery(buildSubmissionContext(d1Submission), listenUrl, {
    idempotencyKey: `day7/${d1Submission._id}`,
  });
  const delivery = {
    deliveredAt: new Date().toISOString(),
    voiceNoteUrl: resolved.voiceNoteUrl,
    pdfUrl: resolved.pdfUrl,
  };
  if (sendResult.kind === "dry_run") {
    await markSubmissionDeliveredIfUnset(d1Submission._id, delivery);
    return "dryRun";
  }
  if (sendResult.kind !== "sent") return "skipped";
  await recordDay7Sent(d1Submission._id, delivery, sendResult.resendId);
  return "sent";
}

export async function deliverRequested(submissionId: string): Promise<DeliverOutcome> {
  const submission = await findSubmissionById(submissionId);
  if (!submission) return "notFound";
  const [resolved] = await fetchDeliverableSubmissions([submissionId], "deliveryRequestedAt");
  if (!resolved) return "awaitingAssets";
  return deliverOne(submission, resolved);
}
