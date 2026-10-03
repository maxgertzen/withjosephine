import { mintListenToken } from "@/lib/auth/listenToken";
import { findDay7Entry } from "@/lib/booking/day7Entry";
import {
  type DeliverableSubmission,
  fetchDeliverableSubmissions,
} from "@/lib/booking/persistence/sanityDelivery";
import {
  buildSubmissionContext,
  claimDay7Attempt,
  clearDay7Attempt,
  findSubmissionById,
  markSubmissionDeliveredIfUnset,
  recordDay7Sent,
  type SubmissionDelivery,
  type SubmissionRecord,
} from "@/lib/booking/submissions";
import { siteOrigin } from "@/lib/env";
import { type EmailSendResult, sendDay7Delivery } from "@/lib/resend";

export const DAY7_ATTEMPT_RETRY_WINDOW_MS = 20 * 60 * 60 * 1000;
export const DAY7_RECORD_TRIES = 3;
const DAY7_RECORD_RETRY_DELAY_MS = 100;

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

async function recordDay7SentWithRetries(
  submissionId: string,
  delivery: SubmissionDelivery,
  resendId: string,
): Promise<boolean> {
  for (let tryNumber = 1; tryNumber <= DAY7_RECORD_TRIES; tryNumber += 1) {
    try {
      await recordDay7Sent(submissionId, delivery, resendId);
      return true;
    } catch (error) {
      console.error(
        `[deliver-day7] recording the sent email failed for ${submissionId} (try ${tryNumber} of ${DAY7_RECORD_TRIES})`,
        error,
      );
      if (tryNumber < DAY7_RECORD_TRIES) {
        await new Promise((resolve) => setTimeout(resolve, DAY7_RECORD_RETRY_DELAY_MS * tryNumber));
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
  if (findDay7Entry(d1Submission.emailsFired)) return "alreadySent";

  if (!d1Submission.recipientUserId) {
    console.error(`[cron-day-7] missing recipientUserId for ${submissionId}, cannot mint token`);
    return "skipped";
  }

  const attempt = await claimDay7Attempt(submissionId, {
    attemptedAt: new Date().toISOString(),
    jti: crypto.randomUUID(),
  });
  if (!attempt) return "skipped";
  const attemptedAtMs = Date.parse(attempt.attemptedAt);
  if (Date.now() - attemptedAtMs > DAY7_ATTEMPT_RETRY_WINDOW_MS) {
    console.error(
      `[deliver-day7] attempt from ${attempt.attemptedAt} for ${submissionId} is past the retry window and unrecorded`,
    );
    await clearDay7Attempt(submissionId);
    return "attemptExpired";
  }

  const token = await mintListenToken({
    submissionId,
    recipientUserId: d1Submission.recipientUserId,
    mintSource: "cron_day7",
    now: attemptedAtMs,
    jti: attempt.jti,
  });
  const listenUrl = `${siteOrigin()}/listen/${submissionId}?t=${token}`;
  const sendResult = await sendDay7Delivery(buildSubmissionContext(d1Submission), listenUrl, {
    idempotencyKey: `day7/${submissionId}`,
  });
  const assetUrls = { voiceNoteUrl: resolved.voiceNoteUrl, pdfUrl: resolved.pdfUrl };

  if (sendResult.kind === "sent") {
    const recorded = await recordDay7SentWithRetries(
      submissionId,
      { deliveredAt: attempt.attemptedAt, ...assetUrls },
      sendResult.resendId,
    );
    return recorded ? "sent" : "retryLater";
  }
  if (sendResult.kind === "dry_run") {
    await clearDay7Attempt(submissionId);
    await markSubmissionDeliveredIfUnset(submissionId, {
      deliveredAt: new Date().toISOString(),
      ...assetUrls,
    });
    return "dryRun";
  }
  const handling = handleUnsent(sendResult);
  if (handling === "retryLater") return "retryLater";
  if (handling === "clearAttemptAndFail") await clearDay7Attempt(submissionId);
  return "skipped";
}

export async function deliverRequested(submissionId: string): Promise<DeliverOutcome> {
  const submission = await findSubmissionById(submissionId);
  if (!submission) return "notFound";
  const [resolved] = await fetchDeliverableSubmissions([submissionId]);
  if (!resolved) return "awaitingAssets";
  return deliverOne(submission, resolved);
}
