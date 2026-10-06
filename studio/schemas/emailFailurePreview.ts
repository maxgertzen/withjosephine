import { asCustomerEmailType } from "../../src/lib/booking/emailFiredType";
import type { CustomerEmailType } from "../../src/lib/page-previews/types";
import { dateTimeFormatter } from "../lib/studioRequests";

export const EMAIL_TYPE_LABELS: Record<CustomerEmailType, string> = {
  order_confirmation: "Order confirmation",
  reading_delivery: "Reading delivery",
};

export const FAILURE_KIND_LABELS: Record<string, string> = {
  send_error: "Not sent: Resend returned an error",
  maybe_sent: "May already have been sent, check Resend",
  unrecorded: "No record that it was sent",
  bounced: "Bounced",
  complained: "Marked as spam by the customer",
  suppressed: "Not sent: the address is on Resend's suppression list",
  refused: "Not sent",
};

const REFUSED_REASON_LABELS: Record<string, string> = {
  rate_limited: "already resent 3 times in 24 hours",
  invalid_address: "not a valid email address",
  files_missing: "the voice note or the PDF is missing",
  reading_expired: "the reading's access window has ended",
  missing_recipient_user: "no customer record",
  no_api_key: "the email service is not set up",
  no_notification_email: "the notification address is not set up",
  gift_not_active: "the gift is no longer waiting to be opened",
  gift_not_opened: "the gift has not been opened",
  missing_buyer_email: "no buyer address on the gift",
  missing_gift_code: "the gift code could not be made",
};

export type EmailFailurePreviewInput = {
  emailType?: string;
  kind?: string;
  errorCode?: string;
  recipient?: string;
  attemptNumber?: number;
  failedAt?: string;
  resolvedAt?: string;
};

function whatHappened(kind: string | undefined, errorCode: string | undefined): string {
  const label = (kind && FAILURE_KIND_LABELS[kind]) || "Not sent";
  const reason = kind === "refused" && errorCode ? REFUSED_REASON_LABELS[errorCode] : undefined;
  return reason ? `${label}: ${reason}` : label;
}

export function buildFailurePreview(
  emailLabel: string,
  sentTo: string | undefined,
  failure: EmailFailurePreviewInput,
) {
  const failedAtMs = failure.failedAt ? Date.parse(failure.failedAt) : Number.NaN;
  const subtitle = [
    failure.resolvedAt ? "Sent since" : `Attempt ${failure.attemptNumber ?? 1}`,
    Number.isNaN(failedAtMs) ? null : dateTimeFormatter.format(failedAtMs),
    sentTo ? `to ${sentTo}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  return {
    title: `${emailLabel}: ${whatHappened(failure.kind, failure.errorCode)}`,
    subtitle,
  };
}

export function prepareEmailFailurePreview(failure: EmailFailurePreviewInput) {
  const emailType = asCustomerEmailType(failure.emailType);
  const emailLabel = emailType ? EMAIL_TYPE_LABELS[emailType] : "Email";
  return buildFailurePreview(emailLabel, failure.recipient, failure);
}
