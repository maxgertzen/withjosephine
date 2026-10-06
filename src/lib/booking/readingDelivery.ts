import { mintListenToken } from "@/lib/auth/listenToken";
import {
  type EmailFailureFields,
  failureFromError,
  failureFromUnsentResult,
  recordEmailFailure,
} from "@/lib/booking/emailFailures";
import { findReadingDeliveryEntry } from "@/lib/booking/emailFiredType";
import {
  type DeliverableSubmission,
  fetchDeliverableSubmissions,
} from "@/lib/booking/persistence/sanityDelivery";
import {
  buildSubmissionContext,
  type ClaimedReadingDeliveryAttempt,
  claimReadingDeliveryAttempt,
  claimReadingDeliveryAttemptBody,
  clearReadingDeliveryAttempt,
  findSubmissionById,
  markSubmissionDeliveredIfUnset,
  recordReadingDeliverySent,
  type RenderedEmail,
  type SubmissionDelivery,
  type SubmissionRecord,
} from "@/lib/booking/submissions";
import { siteOrigin } from "@/lib/env";
import {
  type EmailSendResult,
  renderReadingDelivery,
  sendRenderedReadingDelivery,
} from "@/lib/resend";

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

const DELIVERED_OUTCOMES = ["sent", "alreadySent", "dryRun"] as const;

export function isDelivered(
  outcome: DeliverOutcome,
): outcome is (typeof DELIVERED_OUTCOMES)[number] {
  return (DELIVERED_OUTCOMES as readonly string[]).includes(outcome);
}

export function listenUrlFor(submissionId: string, token: string): string {
  return `${siteOrigin()}/listen/${submissionId}?t=${token}`;
}

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

async function attemptEmail(
  submission: SubmissionRecord,
  recipientUserId: string,
  attempt: ClaimedReadingDeliveryAttempt,
): Promise<RenderedEmail> {
  if (attempt.body) return attempt.body;
  const token = await mintListenToken({
    submissionId: submission._id,
    recipientUserId,
    mintSource: "reading_delivery",
    now: Date.parse(attempt.attemptedAt),
    jti: attempt.jti,
  });
  const rendered = await renderReadingDelivery(
    buildSubmissionContext(submission),
    listenUrlFor(submission._id, token),
  );
  return (await claimReadingDeliveryAttemptBody(submission._id, attempt.jti, rendered)) ?? rendered;
}

function recordReadingDeliveryFailure(
  submission: SubmissionRecord,
  fields: Omit<EmailFailureFields, "emailType" | "recipient">,
): Promise<void> {
  return recordEmailFailure(submission._id, {
    emailType: "reading_delivery",
    recipient: submission.email,
    ...fields,
  });
}

export async function deliverOne(
  d1Submission: SubmissionRecord,
  resolved: DeliverableSubmission,
): Promise<DeliverOneOutcome> {
  const submissionId = d1Submission._id;
  if (d1Submission.status !== "paid" || d1Submission.isLegacyGift) return "skipped";
  if (findReadingDeliveryEntry(d1Submission.emailsFired)) return "alreadySent";

  const { recipientUserId } = d1Submission;
  if (!recipientUserId) {
    await recordReadingDeliveryFailure(d1Submission, {
      kind: "refused",
      errorCode: "missing_recipient_user",
    });
    return "skipped";
  }

  const attempt = await claimReadingDeliveryAttempt(submissionId, {
    attemptedAt: new Date().toISOString(),
    jti: crypto.randomUUID(),
  });
  if (!attempt) return "skipped";
  if (Date.now() - Date.parse(attempt.attemptedAt) > ATTEMPT_RETRY_WINDOW_MS) {
    await clearReadingDeliveryAttempt(submissionId);
    await recordReadingDeliveryFailure(d1Submission, {
      kind: "unrecorded",
      attemptedAt: attempt.attemptedAt,
    });
    return "attemptExpired";
  }

  const email = await attemptEmail(d1Submission, recipientUserId, attempt);
  const sendResult = await sendRenderedReadingDelivery(
    { id: submissionId, email: d1Submission.email },
    email,
    { idempotencyKey: `reading-delivery/${submissionId}/${attempt.jti}` },
  );
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
  await recordReadingDeliveryFailure(d1Submission, {
    ...failureFromUnsentResult(sendResult),
    attemptedAt: attempt.attemptedAt,
  });
  return "skipped";
}

export async function deliverRequested(submissionId: string): Promise<DeliverOutcome> {
  const submission = await findSubmissionById(submissionId);
  if (!submission) return "notFound";
  const [resolved] = await fetchDeliverableSubmissions([submissionId]);
  if (!resolved) return "awaitingAssets";
  try {
    return await deliverOne(submission, resolved);
  } catch (error) {
    console.error(`[reading-delivery] delivery failed for ${submissionId}`, error);
    await recordReadingDeliveryFailure(submission, failureFromError(error));
    return "skipped";
  }
}
