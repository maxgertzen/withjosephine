import { mintListenToken } from "@/lib/auth/listenToken";
import { findReadingDeliveryEntry } from "@/lib/booking/emailFiredType";
import {
  type DeliverableSubmission,
  fetchDeliverableSubmissions,
} from "@/lib/booking/persistence/sanityDelivery";
import {
  buildSubmissionContext,
  claimReadingDeliveryAttempt,
  clearReadingDeliveryAttempt,
  findSubmissionById,
  markSubmissionDeliveredIfUnset,
  recordReadingDeliverySent,
  type SubmissionDelivery,
  type SubmissionRecord,
} from "@/lib/booking/submissions";
import { siteOrigin } from "@/lib/env";
import { type EmailSendResult, sendReadingDelivery } from "@/lib/resend";

export const ATTEMPT_RETRY_WINDOW_MS = 20 * 60 * 60 * 1000;
export const RECORD_TRIES = 3;
const RECORD_RETRY_DELAY_MS = 100;

type DeliverOneOutcome =
  | "sent"
  | "alreadySent"
  | "dryRun"
  | "skipped"
  | "retryLater"
  | "attemptExpired";

export type DeliverOutcome = DeliverOneOutcome | "awaitingAssets" | "notFound";

type UnsentResult = Extract<EmailSendResult, { kind: "skipped" | "failed" }>;
type UnsentHandling = "retryLater" | "clearAttemptAndFail" | "keepAttemptAndFail";

function handleUnsent(result: UnsentResult): UnsentHandling {
  if (result.kind === "skipped") return "clearAttemptAndFail";
  if (result.error === "concurrent_idempotent_requests") return "retryLater";
  if (result.error === "invalid_idempotent_request") return "keepAttemptAndFail";
  const status = result.statusCode ?? 0;
  return status >= 400 && status < 500 ? "clearAttemptAndFail" : "keepAttemptAndFail";
}

async function recordSentWithRetries(
  submissionId: string,
  delivery: SubmissionDelivery,
  resendId: string,
): Promise<boolean> {
  for (let tryNumber = 1; tryNumber <= RECORD_TRIES; tryNumber += 1) {
    try {
      await recordReadingDeliverySent(submissionId, delivery, resendId);
      return true;
    } catch (error) {
      console.error(
        `[reading-delivery] recording the sent email failed for ${submissionId} (try ${tryNumber} of ${RECORD_TRIES})`,
        error,
      );
      if (tryNumber < RECORD_TRIES) {
        await new Promise((resolve) => setTimeout(resolve, RECORD_RETRY_DELAY_MS * tryNumber));
      }
    }
  }
  return false;
}

export async function deliverOne(
  d1Submission: SubmissionRecord,
  resolved: DeliverableSubmission,
): Promise<DeliverOneOutcome> {
  const submissionId = d1Submission._id;
  if (d1Submission.status !== "paid" || d1Submission.isLegacyGift) return "skipped";
  if (findReadingDeliveryEntry(d1Submission.emailsFired)) return "alreadySent";

  if (!d1Submission.recipientUserId) {
    console.error(`[reading-delivery] missing recipientUserId for ${submissionId}, cannot mint token`);
    return "skipped";
  }

  const attempt = await claimReadingDeliveryAttempt(submissionId, {
    attemptedAt: new Date().toISOString(),
    jti: crypto.randomUUID(),
  });
  if (!attempt) return "skipped";
  const attemptedAtMs = Date.parse(attempt.attemptedAt);
  if (Date.now() - attemptedAtMs > ATTEMPT_RETRY_WINDOW_MS) {
    console.error(
      `[reading-delivery] attempt from ${attempt.attemptedAt} for ${submissionId} is past the retry window and unrecorded`,
    );
    await clearReadingDeliveryAttempt(submissionId);
    return "attemptExpired";
  }

  const token = await mintListenToken({
    submissionId,
    recipientUserId: d1Submission.recipientUserId,
    mintSource: "reading_delivery",
    now: attemptedAtMs,
    jti: attempt.jti,
  });
  const listenUrl = `${siteOrigin()}/listen/${submissionId}?t=${token}`;
  const sendResult = await sendReadingDelivery(buildSubmissionContext(d1Submission), listenUrl, {
    idempotencyKey: `reading-delivery/${submissionId}`,
  });
  const assetUrls = { voiceNoteUrl: resolved.voiceNoteUrl, pdfUrl: resolved.pdfUrl };

  if (sendResult.kind === "sent") {
    const recorded = await recordSentWithRetries(
      submissionId,
      { deliveredAt: attempt.attemptedAt, ...assetUrls },
      sendResult.resendId,
    );
    return recorded ? "sent" : "retryLater";
  }
  if (sendResult.kind === "dry_run") {
    await clearReadingDeliveryAttempt(submissionId);
    await markSubmissionDeliveredIfUnset(submissionId, {
      deliveredAt: new Date().toISOString(),
      ...assetUrls,
    });
    return "dryRun";
  }
  const handling = handleUnsent(sendResult);
  if (handling === "retryLater") return "retryLater";
  if (handling === "clearAttemptAndFail") await clearReadingDeliveryAttempt(submissionId);
  return "skipped";
}

export async function deliverRequested(submissionId: string): Promise<DeliverOutcome> {
  const submission = await findSubmissionById(submissionId);
  if (!submission) return "notFound";
  const [resolved] = await fetchDeliverableSubmissions([submissionId]);
  if (!resolved) return "awaitingAssets";
  return deliverOne(submission, resolved);
}
