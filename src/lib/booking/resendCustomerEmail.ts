import { LISTEN_TOKEN_TTL_MS, mintListenToken } from "@/lib/auth/listenToken";
import { normalizeEmail } from "@/lib/auth/users";
import { isValidEmail } from "@/lib/formStyles";
import { findGiftById } from "@/lib/gift/gifts";

import { type EmailSendResult, sendCustomerConfirmation, sendReadingDelivery } from "../resend";
import { mintDataExportUrl } from "./dataExportUrl";
import { correctCustomerEmail } from "./emailCorrection";
import {
  type EmailFailureFields,
  failureFromError,
  failureFromUnsentResult,
  hasOpenUndeliveredFailure,
  recordEmailFailure,
} from "./emailFailures";
import { findReadingDeliveryEntry, isEmailFiredOfType } from "./emailFiredType";
import { deliverRequested, isDelivered, listenUrlFor } from "./readingDelivery";
import { READING_ACCESS_TTL_MS } from "./readingRetention";
import {
  type CustomerResendRequest,
  isResendLimitReached,
  type ResendOutcome,
  settleResend,
} from "./resendRequest";
import {
  appendEmailFired,
  buildSubmissionContext,
  type CustomerEmailType,
  type EmailFiredType,
  findSubmissionById,
  type SubmissionRecord,
} from "./submissions";

type RefusedReason =
  | "rate_limited"
  | "invalid_address"
  | "files_missing"
  | "reading_expired"
  | "missing_recipient_user";

const IDEMPOTENCY_KEY_PREFIX: Record<CustomerEmailType, string> = {
  order_confirmation: "order-confirmation",
  reading_delivery: "reading-delivery",
};

function recordResendFailure(
  request: CustomerResendRequest,
  recipient: string,
  fields: Omit<EmailFailureFields, "emailType" | "recipient">,
): Promise<void> {
  return recordEmailFailure(request.submissionId, {
    emailType: request.emailType,
    recipient,
    ...fields,
  });
}

async function refuse(
  request: CustomerResendRequest,
  recipient: string,
  errorCode: RefusedReason,
): Promise<"refused"> {
  await recordResendFailure(request, recipient, { kind: "refused", errorCode });
  return "refused";
}

function listenTokenTtl(submission: SubmissionRecord, restartsAccessWindow: boolean): number {
  if (restartsAccessWindow || !submission.deliveredAt) return LISTEN_TOKEN_TTL_MS;
  const msUntilReadingExpires =
    Date.parse(submission.deliveredAt) + READING_ACCESS_TTL_MS - Date.now();
  return Math.max(0, Math.min(LISTEN_TOKEN_TTL_MS, msUntilReadingExpires));
}

type CustomerEmailSend = { firedType: EmailFiredType; result: EmailSendResult };

async function sendConfirmationAgain(
  submission: SubmissionRecord,
  idempotencyKey: string,
): Promise<CustomerEmailSend> {
  const [dataExportUrl, gift] = await Promise.all([
    mintDataExportUrl({
      submissionId: submission._id,
      recipientUserId: submission.recipientUserId,
      mintSource: "admin_resend",
    }),
    submission.giftCodeId ? findGiftById(submission.giftCodeId) : null,
  ]);
  return sendCustomerConfirmation(buildSubmissionContext(submission), {
    dataExportUrl,
    idempotencyKey,
    giftBuyerFirstName: submission.giftCodeId ? (gift?.buyerFirstName ?? "") : undefined,
  });
}

async function sendAgain(
  request: CustomerResendRequest,
  submission: SubmissionRecord,
  restartsAccessWindow: boolean,
): Promise<CustomerEmailSend | RefusedReason> {
  const idempotencyKey = `${IDEMPOTENCY_KEY_PREFIX[request.emailType]}/${request.submissionId}/resend/${Date.parse(request.requestedAt)}`;
  if (request.emailType === "order_confirmation") {
    return sendConfirmationAgain(submission, idempotencyKey);
  }
  if (!submission.recipientUserId) return "missing_recipient_user";
  const ttlMs = listenTokenTtl(submission, restartsAccessWindow);
  if (ttlMs === 0) return "reading_expired";
  const token = await mintListenToken({
    submissionId: submission._id,
    recipientUserId: submission.recipientUserId,
    mintSource: "admin_resend",
    ttlMs,
  });
  return {
    firedType: "reading_delivery",
    result: await sendReadingDelivery(
      buildSubmissionContext(submission),
      listenUrlFor(submission._id, token),
      { idempotencyKey },
    ),
  };
}

type SentResend = CustomerEmailSend & {
  submission: SubmissionRecord;
  restartsAccessWindow: boolean;
};

async function sendRecordedEmail(
  request: CustomerResendRequest,
  submission: SubmissionRecord,
): Promise<SentResend | ResendOutcome> {
  const isRequestedType = (type: string) => isEmailFiredOfType(type, request.emailType);
  if (isResendLimitReached(submission.emailsFired ?? [], isRequestedType, Date.now())) {
    return refuse(request, submission.email, "rate_limited");
  }
  const restartsAccessWindow =
    request.emailType === "reading_delivery" &&
    hasOpenUndeliveredFailure(submission.emailFailures, "reading_delivery");
  const sent = await sendAgain(request, submission, restartsAccessWindow);
  if (typeof sent === "string") return refuse(request, submission.email, sent);
  return { ...sent, submission, restartsAccessWindow };
}

function settleSentResend(
  request: CustomerResendRequest,
  { submission, firedType, result, restartsAccessWindow }: SentResend,
): Promise<ResendOutcome> {
  return settleResend(result, {
    recordFailure: (unsent) =>
      recordResendFailure(request, submission.email, failureFromUnsentResult(unsent)),
    recordSent: async (resendId) => {
      const sentAt = new Date().toISOString();
      await appendEmailFired(
        submission._id,
        { type: firedType, sentAt, resendId },
        restartsAccessWindow ? { deliveredAt: sentAt } : undefined,
      );
    },
  });
}

async function sendFirstReadingDelivery(
  request: CustomerResendRequest,
  submission: SubmissionRecord,
): Promise<ResendOutcome> {
  const outcome = await deliverRequested(submission._id);
  if (outcome === "awaitingAssets") return refuse(request, submission.email, "files_missing");
  if (isDelivered(outcome)) return outcome === "dryRun" ? "dryRun" : "sent";
  return outcome === "retryLater" ? "retryLater" : "failed";
}

async function withCorrectedEmail(
  request: CustomerResendRequest,
  submission: SubmissionRecord,
): Promise<SubmissionRecord | "invalid"> {
  const corrected = request.correctedEmail;
  if (!corrected || normalizeEmail(corrected) === normalizeEmail(submission.email)) {
    return submission;
  }
  if (!isValidEmail(corrected)) return "invalid";
  return correctCustomerEmail(submission, corrected);
}

async function correctAndSend(
  request: CustomerResendRequest,
  found: SubmissionRecord,
): Promise<SentResend | ResendOutcome> {
  const submission = await withCorrectedEmail(request, found);
  if (submission === "invalid") {
    return refuse(request, request.correctedEmail ?? found.email, "invalid_address");
  }
  if (
    request.emailType === "reading_delivery" &&
    !findReadingDeliveryEntry(submission.emailsFired)
  ) {
    return sendFirstReadingDelivery(request, submission);
  }
  return sendRecordedEmail(request, submission);
}

export async function processResendRequest(request: CustomerResendRequest): Promise<ResendOutcome> {
  const found = await findSubmissionById(request.submissionId);
  if (!found) return "notFound";
  if (found.status !== "paid") return "refused";
  let sent: SentResend | ResendOutcome;
  try {
    sent = await correctAndSend(request, found);
  } catch (error) {
    await recordResendFailure(request, found.email, failureFromError(error));
    return "failed";
  }
  return typeof sent === "string" ? sent : settleSentResend(request, sent);
}
