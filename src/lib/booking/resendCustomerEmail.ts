import { LISTEN_TOKEN_TTL_MS, mintListenToken } from "@/lib/auth/listenToken";
import { normalizeEmail } from "@/lib/auth/users";
import { isValidEmail } from "@/lib/formStyles";
import { type GiftResendRequest, processGiftResendRequest } from "@/lib/gift/giftEmailResend";
import { findGiftById } from "@/lib/gift/gifts";
import { asGiftEmailType } from "@/lib/gift/types";

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
import { isResendLimitReached } from "./resendLimit";
import {
  appendEmailFired,
  buildSubmissionContext,
  type CustomerEmailType,
  type EmailFiredType,
  findSubmissionById,
  type SubmissionRecord,
} from "./submissions";

type CustomerResendRequest = {
  submissionId: string;
  emailType: CustomerEmailType;
  correctedEmail: string | null;
  requestedAt: string;
};

export type ResendRequest = CustomerResendRequest | GiftResendRequest;

function isGiftResendRequest(request: ResendRequest): request is GiftResendRequest {
  return asGiftEmailType(request.emailType) !== null;
}

export type ResendOutcome = "sent" | "dryRun" | "retryLater" | "failed" | "refused" | "notFound";

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

function sentAtsOfType(submission: SubmissionRecord, emailType: CustomerEmailType): string[] {
  return (submission.emailsFired ?? [])
    .filter((entry) => isEmailFiredOfType(entry.type, emailType))
    .map((entry) => entry.sentAt);
}

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

async function resendRecordedEmail(
  request: CustomerResendRequest,
  submission: SubmissionRecord,
): Promise<ResendOutcome> {
  if (isResendLimitReached(sentAtsOfType(submission, request.emailType), Date.now())) {
    return refuse(request, submission.email, "rate_limited");
  }
  const restartsAccessWindow =
    request.emailType === "reading_delivery" &&
    hasOpenUndeliveredFailure(submission.emailFailures, "reading_delivery");
  const sent = await sendAgain(request, submission, restartsAccessWindow);
  if (typeof sent === "string") return refuse(request, submission.email, sent);
  const { firedType, result } = sent;
  if (result.kind === "failed" && result.error === "concurrent_idempotent_requests") {
    return "retryLater";
  }
  if (result.kind === "failed" || result.kind === "skipped") {
    await recordResendFailure(request, submission.email, failureFromUnsentResult(result));
    return "failed";
  }
  const sentAt = new Date().toISOString();
  await appendEmailFired(
    submission._id,
    {
      type: firedType,
      sentAt,
      resendId: result.kind === "sent" ? result.resendId : null,
    },
    restartsAccessWindow ? { deliveredAt: sentAt } : undefined,
  );
  return result.kind === "sent" ? "sent" : "dryRun";
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

export async function processResendRequest(request: ResendRequest): Promise<ResendOutcome> {
  if (isGiftResendRequest(request)) return processGiftResendRequest(request);
  const found = await findSubmissionById(request.submissionId);
  if (!found) return "notFound";
  if (found.status !== "paid") return "refused";
  try {
    const submission = await withCorrectedEmail(request, found);
    if (submission === "invalid") {
      return await refuse(request, request.correctedEmail ?? found.email, "invalid_address");
    }
    if (
      request.emailType === "reading_delivery" &&
      !findReadingDeliveryEntry(submission.emailsFired)
    ) {
      return await sendFirstReadingDelivery(request, submission);
    }
    return await resendRecordedEmail(request, submission);
  } catch (error) {
    await recordResendFailure(request, found.email, failureFromError(error));
    return "failed";
  }
}
