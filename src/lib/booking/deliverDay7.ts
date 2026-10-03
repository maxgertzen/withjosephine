import { mintListenToken } from "@/lib/auth/listenToken";
import { findDay7Entry } from "@/lib/booking/day7Entry";
import {
  type DeliverableSubmission,
  fetchDeliverableSubmissions,
} from "@/lib/booking/persistence/sanityDelivery";
import { sendAndRecord } from "@/lib/booking/sendAndRecord";
import {
  buildSubmissionContext,
  findSubmissionById,
  markSubmissionDelivered,
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

  const delivery = {
    deliveredAt: resolved.deliveredAt,
    voiceNoteUrl: resolved.voiceNoteUrl,
    pdfUrl: resolved.pdfUrl,
  };
  await markSubmissionDelivered(d1Submission._id, delivery);
  const refreshed: SubmissionRecord = { ...d1Submission, ...delivery };

  const token = await mintListenToken({
    submissionId: refreshed._id,
    recipientUserId: d1Submission.recipientUserId,
    mintSource: "cron_day7",
  });
  const listenUrl = `${siteOrigin()}/listen/${refreshed._id}?t=${token}`;
  const context = buildSubmissionContext(refreshed);
  const sendResult = await sendAndRecord({
    submissionId: refreshed._id,
    type: "day7",
    send: () =>
      sendDay7Delivery(context, listenUrl, { idempotencyKey: `day7/${refreshed._id}` }),
  });
  if (sendResult.appended) return "sent";
  return sendResult.kind === "dry_run" ? "dryRun" : "skipped";
}

export async function deliverById(submissionId: string): Promise<DeliverOutcome> {
  const submission = await findSubmissionById(submissionId);
  if (!submission) return "notFound";
  const [resolved] = await fetchDeliverableSubmissions([submissionId]);
  if (!resolved) return "awaitingAssets";
  return deliverOne(submission, resolved);
}
