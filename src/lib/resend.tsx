import { render } from "@react-email/render";
import { Resend } from "resend";

import { generateAnonymousDistinctId, serverTrack } from "./analytics/server";
import type { EmailSubType } from "./analytics/server-events";
import { ContactMessage } from "./emails/ContactMessage";
import { Day2Started } from "./emails/Day2Started";
import { Day7Delivery } from "./emails/Day7Delivery";
import { Day7OverdueAlert } from "./emails/Day7OverdueAlert";
import { GiftClaimEmail, type GiftClaimEmailVars } from "./emails/GiftClaimEmail";
import { GiftPurchaseConfirmation, type GiftPurchaseConfirmationVars } from "./emails/GiftPurchaseConfirmation";
import { JosephineNotification } from "./emails/JosephineNotification";
import { MagicLink } from "./emails/MagicLink";
import { OrderConfirmation } from "./emails/OrderConfirmation";
import { isFlagEnabled } from "./env";

const FROM_ADDRESS = "Josephine <hello@withjosephine.com>";

export type SubmissionResponse = {
  fieldKey: string;
  fieldLabelSnapshot: string;
  fieldType: string;
  value: string;
};

export type SubmissionContext = {
  id: string;
  email: string;
  firstName: string;
  readingName: string;
  readingPriceDisplay: string;
  amountPaidDisplay: string | null;
  responses: SubmissionResponse[];
  photoUrl: string | null;
  createdAt: string;
};

export type EmailSendResult = { resendId: string | null };

let cachedClient: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!cachedClient) cachedClient = new Resend(apiKey);
  return cachedClient;
}

/**
 * Redact the local-part of an email address for logs: "ada@example.com" →
 * "a***@example.com". Worker logs aren't a long-term store, but there's no
 * upside to writing full recipient addresses to wrangler tail.
 */
function redactEmail(address: string) {
  return address.replace(/(^.)([^@]+)(?=@)/, "$1***");
}

function redactRecipient(to: string | string[]) {
  return Array.isArray(to) ? to.map(redactEmail).join(",") : redactEmail(to);
}

async function sendOrSkip(args: {
  to: string | string[];
  subject: string;
  html: string;
  emailKind: string;
  subType: EmailSubType;
  submissionId: string | null;
  replyTo?: string;
}): Promise<EmailSendResult> {
  // Dry-run is the more specific intent — check it before the API-key path so
  // staging without a real key still emits the dry-run signal we actually want.
  if (isFlagEnabled("RESEND_DRY_RUN")) {
    console.warn(`[resend] RESEND_DRY_RUN — skipping ${args.emailKind} (to=${redactRecipient(args.to)})`);
    return { resendId: null };
  }
  const client = getResendClient();
  if (!client) {
    console.warn(`[resend] RESEND_API_KEY not set — skipping ${args.emailKind}`);
    return { resendId: null };
  }
  const response = await client.emails.send({
    from: FROM_ADDRESS,
    to: args.to,
    subject: args.subject,
    html: args.html,
    ...(args.replyTo ? { replyTo: args.replyTo } : {}),
  });
  const resendId = response.data?.id ?? null;

  void serverTrack("email_sent", {
    distinct_id: args.submissionId ?? generateAnonymousDistinctId(),
    sub_type: args.subType,
    submission_id: args.submissionId,
    recipient_redacted: redactRecipient(args.to),
    resend_id_present: resendId !== null,
  });

  return { resendId };
}

export async function sendNotificationToJosephine(
  submission: SubmissionContext,
): Promise<EmailSendResult> {
  const notificationEmail = process.env.NOTIFICATION_EMAIL;
  if (!notificationEmail) {
    console.warn("[resend] NOTIFICATION_EMAIL not set — skipping Josephine notification");
    return { resendId: null };
  }

  const html = await render(
    <JosephineNotification
      readingName={submission.readingName}
      readingPriceDisplay={submission.readingPriceDisplay}
      amountPaidDisplay={submission.amountPaidDisplay}
      email={submission.email}
      createdAt={submission.createdAt}
      submissionId={submission.id}
      photoUrl={submission.photoUrl}
      responses={submission.responses}
    />,
  );

  return sendOrSkip({
    to: notificationEmail,
    subject: `New ${submission.readingName} booking — ${submission.email}`,
    html,
    emailKind: "Josephine notification",
    subType: "josephine_notification",
    submissionId: submission.id,
  });
}

export async function sendOrderConfirmation(
  submission: SubmissionContext,
): Promise<EmailSendResult> {
  const { EMAIL_ORDER_CONFIRMATION_DEFAULTS } = await import("@/data/defaults");
  const { fetchEmailOrderConfirmation } = await import("@/lib/sanity/fetch");
  const sanity = await fetchEmailOrderConfirmation().catch(() => null);
  const copy = { ...EMAIL_ORDER_CONFIRMATION_DEFAULTS, ...(sanity ?? {}) };
  const html = await render(
    <OrderConfirmation
      vars={{
        firstName: submission.firstName,
        readingName: submission.readingName,
        readingPriceDisplay: submission.readingPriceDisplay,
        amountPaidDisplay: submission.amountPaidDisplay,
      }}
      copy={copy}
    />,
  );

  return sendOrSkip({
    to: submission.email,
    subject: copy.subject,
    html,
    emailKind: "order confirmation",
    subType: "order_confirmation",
    submissionId: submission.id,
  });
}

export type GiftPurchaseConfirmationInput = {
  submissionId: string;
  purchaserEmail: string;
  purchaserFirstName: string;
  readingName: string;
  readingPriceDisplay: string;
  amountPaidDisplay: string | null;
  recipientName: string | null;
  giftMessage: string | null;
} & (
  | { variant: "self_send"; claimUrl: string; sendAtDisplay?: never }
  | { variant: "scheduled"; sendAtDisplay: string; claimUrl?: never }
);

export async function sendGiftPurchaseConfirmation(
  input: GiftPurchaseConfirmationInput,
): Promise<EmailSendResult> {
  const { EMAIL_GIFT_PURCHASE_CONFIRMATION_DEFAULTS } = await import("@/data/defaults");
  const { fetchEmailGiftPurchaseConfirmation } = await import("@/lib/sanity/fetch");
  const sanity = await fetchEmailGiftPurchaseConfirmation().catch(() => null);
  const copy = { ...EMAIL_GIFT_PURCHASE_CONFIRMATION_DEFAULTS, ...(sanity ?? {}) };

  const vars: GiftPurchaseConfirmationVars =
    input.variant === "self_send"
      ? {
          variant: "self_send",
          claimUrl: input.claimUrl,
          purchaserFirstName: input.purchaserFirstName,
          readingName: input.readingName,
          readingPriceDisplay: input.readingPriceDisplay,
          amountPaidDisplay: input.amountPaidDisplay,
          recipientName: input.recipientName,
          giftMessage: input.giftMessage,
        }
      : {
          variant: "scheduled",
          sendAtDisplay: input.sendAtDisplay,
          purchaserFirstName: input.purchaserFirstName,
          readingName: input.readingName,
          readingPriceDisplay: input.readingPriceDisplay,
          amountPaidDisplay: input.amountPaidDisplay,
          recipientName: input.recipientName,
          giftMessage: input.giftMessage,
        };

  const subject = input.variant === "self_send" ? copy.subjectSelfSend : copy.subjectScheduled;
  const interpolatedSubject = subject
    .replaceAll("{recipientName}", input.recipientName ?? "your recipient")
    .replaceAll("{sendAtDisplay}", input.variant === "scheduled" ? input.sendAtDisplay : "");

  const html = await render(<GiftPurchaseConfirmation vars={vars} copy={copy} />);

  return sendOrSkip({
    to: input.purchaserEmail,
    subject: interpolatedSubject,
    html,
    emailKind: `gift purchase confirmation (${input.variant})`,
    subType: "gift_purchase_confirmation",
    submissionId: input.submissionId,
  });
}

export type GiftClaimEmailInput = {
  submissionId: string;
  recipientEmail: string;
  recipientName: string;
  purchaserFirstName: string;
  readingName: string;
  giftMessage: string | null;
} & (
  | { variant: "first_send"; claimUrl: string }
  | { variant: "reminder"; claimUrl?: never }
);

export async function sendGiftClaimEmail(input: GiftClaimEmailInput): Promise<EmailSendResult> {
  const { EMAIL_GIFT_CLAIM_DEFAULTS } = await import("@/data/defaults");
  const { fetchEmailGiftClaim } = await import("@/lib/sanity/fetch");
  const sanity = await fetchEmailGiftClaim().catch(() => null);
  const copy = { ...EMAIL_GIFT_CLAIM_DEFAULTS, ...(sanity ?? {}) };

  const shared = {
    recipientName: input.recipientName,
    purchaserFirstName: input.purchaserFirstName,
    readingName: input.readingName,
    giftMessage: input.giftMessage,
  };
  const vars: GiftClaimEmailVars =
    input.variant === "first_send"
      ? { variant: "first_send", claimUrl: input.claimUrl, ...shared }
      : { variant: "reminder", ...shared };

  const subject =
    input.variant === "first_send" ? copy.subjectFirstSend : copy.subjectReminder;
  const interpolatedSubject = subject.replaceAll(
    "{purchaserFirstName}",
    input.purchaserFirstName,
  );

  const html = await render(<GiftClaimEmail vars={vars} copy={copy} />);

  return sendOrSkip({
    to: input.recipientEmail,
    subject: interpolatedSubject,
    html,
    emailKind: `gift claim (${input.variant})`,
    subType: "gift_claim",
    submissionId: input.submissionId,
  });
}

export async function sendDay2Started(submission: SubmissionContext): Promise<EmailSendResult> {
  const { EMAIL_DAY2_STARTED_DEFAULTS } = await import("@/data/defaults");
  const { fetchEmailDay2Started } = await import("@/lib/sanity/fetch");
  const sanity = await fetchEmailDay2Started().catch(() => null);
  const copy = { ...EMAIL_DAY2_STARTED_DEFAULTS, ...(sanity ?? {}) };
  const html = await render(<Day2Started vars={{ firstName: submission.firstName }} copy={copy} />);
  return sendOrSkip({
    to: submission.email,
    subject: copy.subject,
    html,
    emailKind: "Day +2 started",
    subType: "day_2",
    submissionId: submission.id,
  });
}

export async function sendDay7Delivery(
  submission: SubmissionContext,
  listenUrl: string,
): Promise<EmailSendResult> {
  // Lazy imports scope the Sanity fetch to test runs that don't mock it.
  const { EMAIL_DAY7_DELIVERY_DEFAULTS } = await import("@/data/defaults");
  const { fetchEmailDay7Delivery } = await import("@/lib/sanity/fetch");
  const sanity = await fetchEmailDay7Delivery().catch(() => null);
  const copy = { ...EMAIL_DAY7_DELIVERY_DEFAULTS, ...(sanity ?? {}) };
  const subject = copy.subjectTemplate.replaceAll("{readingName}", submission.readingName);
  const html = await render(
    <Day7Delivery
      vars={{
        firstName: submission.firstName,
        readingName: submission.readingName,
        listenUrl,
      }}
      copy={copy}
    />,
  );
  return sendOrSkip({
    to: submission.email,
    subject,
    html,
    emailKind: "Day +7 delivery",
    subType: "day_7_delivery",
    submissionId: submission.id,
  });
}

export async function sendMagicLink(args: {
  to: string;
  magicLinkUrl: string;
}): Promise<EmailSendResult> {
  // Lazy imports scope the Sanity fetch to test runs that don't mock it.
  const { EMAIL_MAGIC_LINK_DEFAULTS } = await import("@/data/defaults");
  const { fetchEmailMagicLink } = await import("@/lib/sanity/fetch");
  const sanity = await fetchEmailMagicLink().catch(() => null);
  const copy = { ...EMAIL_MAGIC_LINK_DEFAULTS, ...(sanity ?? {}) };
  const html = await render(
    <MagicLink
      magicLinkUrl={args.magicLinkUrl}
      preview={copy.preview}
      greeting={copy.greeting}
      body={copy.body}
      signOff={copy.signOff}
    />,
  );
  return sendOrSkip({
    to: args.to,
    subject: copy.subject,
    html,
    emailKind: "magic link",
    subType: "magic_link",
    submissionId: null,
  });
}

/**
 * Phase 4 — GDPR Art. 20 data-portability delivery. Plain-text HTML, no
 * marketing copy, just the pre-signed R2 URL with its expiry window. Lives
 * here rather than in a React Email template because the body is one
 * structural sentence + a link — a full React component would be ceremony.
 */
export async function sendPrivacyExportEmail(args: {
  to: string;
  downloadUrl: string;
  submissionCount: number;
  expiryDays: number;
}): Promise<EmailSendResult> {
  const html = [
    `<p>Your Josephine data export is ready.</p>`,
    `<p>It contains the data we hold for your ${args.submissionCount} reading(s) — intake answers, consent records, transactional records, photos, voice notes, and PDFs (where delivered).</p>`,
    `<p><a href="${args.downloadUrl}">Download your export (ZIP)</a></p>`,
    `<p>This link expires in ${args.expiryDays} days. If you have any questions, reply to this email or write to hello@withjosephine.com.</p>`,
    `<p>With love,<br/>Josephine</p>`,
  ].join("\n");
  return sendOrSkip({
    to: args.to,
    subject: "Your Josephine data export",
    html,
    emailKind: "privacy export",
    subType: "privacy_export",
    submissionId: null,
  });
}

export type ContactPayload = {
  name: string;
  email: string;
  message: string;
};

export async function sendContactMessage(contact: ContactPayload): Promise<EmailSendResult> {
  const notificationEmail = process.env.NOTIFICATION_EMAIL;
  if (!notificationEmail) {
    console.warn("[resend] NOTIFICATION_EMAIL not set — skipping contact message");
    return { resendId: null };
  }

  const html = await render(
    <ContactMessage name={contact.name} email={contact.email} message={contact.message} />,
  );

  return sendOrSkip({
    to: notificationEmail,
    replyTo: contact.email,
    subject: `New message from ${contact.name}`,
    html,
    emailKind: "contact message",
    subType: "contact_form",
    submissionId: null,
  });
}

export async function sendDay7OverdueAlert(submission: SubmissionContext): Promise<EmailSendResult> {
  const notificationEmail = process.env.NOTIFICATION_EMAIL;
  if (!notificationEmail) {
    console.warn("[resend] NOTIFICATION_EMAIL not set — skipping Day +7 overdue alert");
    return { resendId: null };
  }

  const html = await render(
    <Day7OverdueAlert
      email={submission.email}
      readingName={submission.readingName}
      submissionId={submission.id}
      createdAt={submission.createdAt}
    />,
  );
  return sendOrSkip({
    to: notificationEmail,
    subject: `Reading overdue — ${submission.readingName} for ${submission.email}`,
    html,
    emailKind: "Day +7 overdue alert",
    subType: "day_7_overdue_alert",
    submissionId: submission.id,
  });
}
