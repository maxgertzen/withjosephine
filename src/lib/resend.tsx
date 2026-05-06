import { render } from "@react-email/render";
import { Resend } from "resend";

import { generateAnonymousDistinctId, serverTrack } from "./analytics/server";
import type { EmailSubType } from "./analytics/server-events";
import { ContactMessage } from "./emails/ContactMessage";
import { Day2Started } from "./emails/Day2Started";
import { Day7Delivery } from "./emails/Day7Delivery";
import { Day7OverdueAlert } from "./emails/Day7OverdueAlert";
import { JosephineNotification } from "./emails/JosephineNotification";
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
function redactEmail(address: string): string {
  return address.replace(/(^.)([^@]+)(?=@)/, "$1***");
}

function redactRecipient(to: string | string[]): string {
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
  const html = await render(
    <OrderConfirmation
      firstName={submission.firstName}
      readingName={submission.readingName}
      readingPriceDisplay={submission.readingPriceDisplay}
      amountPaidDisplay={submission.amountPaidDisplay}
    />,
  );

  return sendOrSkip({
    to: submission.email,
    subject: "Your reading is booked — here's what happens next",
    html,
    emailKind: "order confirmation",
    subType: "order_confirmation",
    submissionId: submission.id,
  });
}

export async function sendDay2Started(submission: SubmissionContext): Promise<EmailSendResult> {
  const html = await render(<Day2Started firstName={submission.firstName} />);
  return sendOrSkip({
    to: submission.email,
    subject: "A quick note — I've started your reading",
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
  const html = await render(
    <Day7Delivery
      firstName={submission.firstName}
      readingName={submission.readingName}
      listenUrl={listenUrl}
    />,
  );
  return sendOrSkip({
    to: submission.email,
    subject: "Your reading is ready",
    html,
    emailKind: "Day +7 delivery",
    subType: "day_7_delivery",
    submissionId: submission.id,
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
