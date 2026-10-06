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

type FailureData = FailureEvent["data"];

type FailureTarget =
  | { kind: "submission"; submission: SubmissionRecord; emailType: CustomerEmailType }
  | { kind: "gift"; gift: GiftRecord; emailType: GiftEmailFiredType };

async function findTaggedTarget(data: FailureData): Promise<FailureTarget | null | undefined> {
  const tags = data.tags ?? {};
  const giftId = tags[GIFT_EMAIL_TAG.giftId];
  const giftEmailType = asGiftEmailType(tags[GIFT_EMAIL_TAG.emailType]);
  if (giftId && giftEmailType) {
    const gift = await findGiftById(giftId);
    return gift ? { kind: "gift", gift, emailType: giftEmailType } : null;
  }
  const submissionId = tags[CUSTOMER_EMAIL_TAG.submissionId];
  const customerEmailType = asCustomerEmailType(tags[CUSTOMER_EMAIL_TAG.emailType]);
  if (submissionId && customerEmailType) {
    const submission = await findSubmissionById(submissionId);
    return submission ? { kind: "submission", submission, emailType: customerEmailType } : null;
  }
  return undefined;
}

async function findTargetByResendId(resendId: string): Promise<FailureTarget | null> {
  const submission = await findSubmissionByResendId(resendId);
  if (submission) {
    const entry = submission.emailsFired?.find((fired) => fired.resendId === resendId);
    const emailType = asCustomerEmailType(entry?.type);
    return emailType ? { kind: "submission", submission, emailType } : null;
  }
  const gift = await findGiftByResendId(resendId);
  const entry = gift?.emailsFired.find((fired) => fired.resendId === resendId);
  return gift && entry ? { kind: "gift", gift, emailType: entry.type } : null;
}

async function findTarget(data: FailureData): Promise<FailureTarget | null> {
  const tagged = await findTaggedTarget(data);
  return tagged === undefined ? findTargetByResendId(data.email_id) : tagged;
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

function hasNewerSend(
  emailsFired: ReadonlyArray<{ type: string; sentAt: string; resendId: string | null }>,
  matchesType: (type: string) => boolean,
  data: FailureData,
): boolean {
  return emailsFired.some(
    (fired) =>
      matchesType(fired.type) &&
      fired.resendId !== data.email_id &&
      Date.parse(fired.sentAt) > Date.parse(data.created_at),
  );
}

function isAlreadyRecorded(
  failures: ReadonlyArray<{ resendId: string | null; kind: EmailFailureKind }>,
  data: FailureData,
  kind: EmailFailureKind,
): boolean {
  return failures.some((failure) => failure.resendId === data.email_id && failure.kind === kind);
}

function failureFromEvent(event: FailureEvent) {
  return {
    kind: FAILURE_KIND_BY_EVENT[event.type],
    attemptedAt: event.data.created_at,
    failedAt: event.created_at,
    resendId: event.data.email_id,
    ...failureDetails(event),
  };
}

export type ResendWebhookOutcome = "recorded" | "duplicate" | "stale" | "ignored";

async function handleGiftFailure(
  event: FailureEvent,
  gift: GiftRecord,
  emailType: GiftEmailFiredType,
): Promise<ResendWebhookOutcome> {
  const failure = failureFromEvent(event);
  if (hasNewerSend(gift.emailsFired, (type) => type === emailType, event.data)) return "stale";
  if (isAlreadyRecorded(gift.emailFailures, event.data, failure.kind)) return "duplicate";
  if (emailType === "gift_send" && UNDELIVERED_KINDS.has(failure.kind)) {
    await releaseBouncedGiftSend(gift, event.data.email_id);
  }
  await recordGiftEmailFailure(gift.id, { emailType, ...failure });
  return "recorded";
}

async function handleSubmissionFailure(
  event: FailureEvent,
  submission: SubmissionRecord,
  emailType: CustomerEmailType,
): Promise<ResendWebhookOutcome> {
  const failure = failureFromEvent(event);
  const recipient = event.data.to[0];
  const sentElsewhere = recipient && normalizeEmail(recipient) !== normalizeEmail(submission.email);
  const isType = (type: string) => isEmailFiredOfType(type, emailType);
  if (sentElsewhere || hasNewerSend(submission.emailsFired ?? [], isType, event.data)) {
    return "stale";
  }
  if (isAlreadyRecorded(submission.emailFailures ?? [], event.data, failure.kind)) {
    return "duplicate";
  }
  await recordEmailFailure(submission._id, {
    emailType,
    recipient: recipient ?? submission.email,
    ...failure,
  });
  return "recorded";
}

export async function handleResendWebhookEvent(
  event: WebhookEventPayload,
): Promise<ResendWebhookOutcome> {
  if (!isFailureEvent(event)) return "ignored";
  const target = await findTarget(event.data);
  if (!target) return "ignored";
  return target.kind === "gift"
    ? handleGiftFailure(event, target.gift, target.emailType)
    : handleSubmissionFailure(event, target.submission, target.emailType);
}
