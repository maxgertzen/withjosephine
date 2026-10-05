import type { WebhookEventPayload } from "resend";

import { normalizeEmail } from "../auth/users";
import { recordGiftEmailFailure, releaseBouncedGiftSend } from "../gift/giftEmailFailures";
import { findGiftById, findGiftByResendId } from "../gift/gifts";
import { asGiftEmailType, type GiftEmailFiredType, type GiftRecord } from "../gift/types";
import { CUSTOMER_EMAIL_TAG, GIFT_EMAIL_TAG } from "../resend";
import { type EmailFailureFields, recordEmailFailure, UNDELIVERED_KINDS } from "./emailFailures";
import { asCustomerEmailType, isEmailFiredOfType } from "./emailFiredType";
import {
  type CustomerEmailType,
  type EmailFailureKind,
  findSubmissionById,
  findSubmissionByResendId,
  type SubmissionRecord,
} from "./submissions";

const FAILURE_KIND_BY_EVENT = {
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.suppressed": "suppressed",
  "email.failed": "send_error",
} as const satisfies Partial<Record<WebhookEventPayload["type"], EmailFailureKind>>;

type FailureEvent = Extract<WebhookEventPayload, { type: keyof typeof FAILURE_KIND_BY_EVENT }>;

function isFailureEvent(event: WebhookEventPayload): event is FailureEvent {
  return event.type in FAILURE_KIND_BY_EVENT;
}

type GiftTarget = { gift: GiftRecord; emailType: GiftEmailFiredType };

async function findGiftTarget(data: FailureEvent["data"]): Promise<GiftTarget | null> {
  if (data.tags?.[CUSTOMER_EMAIL_TAG.submissionId]) return null;
  const taggedId = data.tags?.[GIFT_EMAIL_TAG.giftId];
  const taggedType = asGiftEmailType(data.tags?.[GIFT_EMAIL_TAG.emailType]);
  if (taggedId && taggedType) {
    const gift = await findGiftById(taggedId);
    return gift ? { gift, emailType: taggedType } : null;
  }
  const gift = await findGiftByResendId(data.email_id);
  const entry = gift?.emailsFired.find((fired) => fired.resendId === data.email_id);
  return gift && entry ? { gift, emailType: entry.type } : null;
}

async function findTarget(
  data: FailureEvent["data"],
): Promise<{ submission: SubmissionRecord; emailType: CustomerEmailType } | null> {
  const taggedId = data.tags?.[CUSTOMER_EMAIL_TAG.submissionId];
  const taggedType = asCustomerEmailType(data.tags?.[CUSTOMER_EMAIL_TAG.emailType]);
  if (taggedId && taggedType) {
    const submission = await findSubmissionById(taggedId);
    return submission ? { submission, emailType: taggedType } : null;
  }
  const submission = await findSubmissionByResendId(data.email_id);
  const entry = submission?.emailsFired?.find((fired) => fired.resendId === data.email_id);
  const emailType = asCustomerEmailType(entry?.type);
  return submission && emailType ? { submission, emailType } : null;
}

function failureDetails(
  event: FailureEvent,
): Pick<EmailFailureFields, "bounceType" | "errorMessage"> {
  switch (event.type) {
    case "email.bounced":
      return {
        bounceType: [event.data.bounce.type, event.data.bounce.subType].filter(Boolean).join(" / "),
        errorMessage: event.data.bounce.message,
      };
    case "email.suppressed":
      return { bounceType: event.data.suppressed.type, errorMessage: event.data.suppressed.message };
    case "email.failed":
      return { bounceType: null, errorMessage: event.data.failed.reason };
    case "email.complained":
      return { bounceType: null, errorMessage: null };
  }
}

function isStale(
  submission: SubmissionRecord,
  emailType: CustomerEmailType,
  data: FailureEvent["data"],
): boolean {
  const recipient = data.to[0];
  if (recipient && normalizeEmail(recipient) !== normalizeEmail(submission.email)) return true;
  return (submission.emailsFired ?? []).some(
    (fired) =>
      isEmailFiredOfType(fired.type, emailType) &&
      fired.resendId !== data.email_id &&
      Date.parse(fired.sentAt) > Date.parse(data.created_at),
  );
}

export type ResendWebhookOutcome = "recorded" | "duplicate" | "stale" | "ignored";

function isStaleGiftEvent(
  gift: GiftRecord,
  emailType: GiftEmailFiredType,
  data: FailureEvent["data"],
): boolean {
  return gift.emailsFired.some(
    (fired) =>
      fired.type === emailType &&
      fired.resendId !== data.email_id &&
      Date.parse(fired.sentAt) > Date.parse(data.created_at),
  );
}

async function handleGiftFailureEvent(
  event: FailureEvent,
  { gift, emailType }: GiftTarget,
): Promise<ResendWebhookOutcome> {
  const kind = FAILURE_KIND_BY_EVENT[event.type];
  if (isStaleGiftEvent(gift, emailType, event.data)) return "stale";
  const alreadyRecorded = gift.emailFailures.some(
    (failure) => failure.resendId === event.data.email_id && failure.kind === kind,
  );
  if (alreadyRecorded) return "duplicate";
  await recordGiftEmailFailure(gift.id, {
    emailType,
    kind,
    attemptedAt: event.data.created_at,
    failedAt: event.created_at,
    resendId: event.data.email_id,
    ...failureDetails(event),
  });
  if (emailType === "gift_send" && UNDELIVERED_KINDS.has(kind)) {
    await releaseBouncedGiftSend(gift, event.data.email_id);
  }
  return "recorded";
}

export async function handleResendWebhookEvent(
  event: WebhookEventPayload,
): Promise<ResendWebhookOutcome> {
  if (!isFailureEvent(event)) return "ignored";
  const giftTarget = await findGiftTarget(event.data);
  if (giftTarget) return handleGiftFailureEvent(event, giftTarget);
  const target = await findTarget(event.data);
  if (!target) return "ignored";
  const kind = FAILURE_KIND_BY_EVENT[event.type];
  const { submission, emailType } = target;
  if (isStale(submission, emailType, event.data)) return "stale";
  const alreadyRecorded = (submission.emailFailures ?? []).some(
    (failure) => failure.resendId === event.data.email_id && failure.kind === kind,
  );
  if (alreadyRecorded) return "duplicate";
  await recordEmailFailure(submission._id, {
    emailType,
    kind,
    recipient: event.data.to[0] ?? submission.email,
    attemptedAt: event.data.created_at,
    failedAt: event.created_at,
    resendId: event.data.email_id,
    ...failureDetails(event),
  });
  return "recorded";
}
