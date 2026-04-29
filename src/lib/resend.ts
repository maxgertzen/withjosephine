import { Resend } from "resend";

import { escapeHtml } from "./utils";

const FROM_ADDRESS = "Josephine <hello@withjosephine.com>";

const EMAIL_BRAND = {
  ink: "#1C1935",
  body: "#3D3633",
  muted: "#7A6F6A",
  divider: "#E8D5C4",
  serifFamily: "'Cormorant Garamond', serif",
  sansFamily: "Inter, sans-serif",
} as const;

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

function renderEmailShell(innerHtml: string, maxWidthPx = 560): string {
  return `
    <div style="font-family: ${EMAIL_BRAND.sansFamily}; color: ${EMAIL_BRAND.body}; max-width: ${maxWidthPx}px; line-height: 1.7;">
      ${innerHtml}
    </div>
  `;
}

function paragraph(text: string): string {
  return `<p>${text}</p>`;
}

function signOff(): string {
  return `<p style="margin-top: 24px;">With love,<br/>Josephine ✦</p>`;
}

function renderResponsesHtml(responses: SubmissionResponse[]): string {
  if (responses.length === 0) return "<p><em>No responses recorded.</em></p>";
  const rows = responses
    .map(
      (response) => `
        <tr>
          <td style="padding: 8px 12px; vertical-align: top; font-weight: 600; color: ${EMAIL_BRAND.body};">
            ${escapeHtml(response.fieldLabelSnapshot)}
          </td>
          <td style="padding: 8px 12px; vertical-align: top; color: ${EMAIL_BRAND.body};">
            ${escapeHtml(response.value)}
          </td>
        </tr>`,
    )
    .join("");
  return `<table style="border-collapse: collapse; width: 100%; font-family: ${EMAIL_BRAND.sansFamily};">${rows}</table>`;
}

async function sendOrSkip(args: {
  to: string | string[];
  subject: string;
  html: string;
  warnPrefix: string;
}): Promise<EmailSendResult> {
  const client = getResendClient();
  if (!client) {
    console.warn(`[resend] RESEND_API_KEY not set — skipping ${args.warnPrefix}`);
    return { resendId: null };
  }
  const response = await client.emails.send({
    from: FROM_ADDRESS,
    to: args.to,
    subject: args.subject,
    html: args.html,
  });
  return { resendId: response.data?.id ?? null };
}

export async function sendNotificationToJosephine(
  submission: SubmissionContext,
): Promise<EmailSendResult> {
  const notificationEmail = process.env.NOTIFICATION_EMAIL;
  if (!notificationEmail) {
    console.warn("[resend] NOTIFICATION_EMAIL not set — skipping Josephine notification");
    return { resendId: null };
  }

  const photoBlock = submission.photoUrl
    ? `<p><strong>Photo:</strong> <a href="${escapeHtml(submission.photoUrl)}">${escapeHtml(submission.photoUrl)}</a></p>`
    : "";

  const inner = `
    <h1 style="font-family: ${EMAIL_BRAND.serifFamily}; color: ${EMAIL_BRAND.ink};">
      New ${escapeHtml(submission.readingName)} booking
    </h1>
    <p><strong>Status:</strong> Paid</p>
    <p><strong>Price:</strong> ${escapeHtml(submission.readingPriceDisplay)}</p>
    <p><strong>Client email:</strong> ${escapeHtml(submission.email)}</p>
    <p><strong>Submitted:</strong> ${escapeHtml(submission.createdAt)}</p>
    <p><strong>Submission ID:</strong> ${escapeHtml(submission.id)}</p>
    ${photoBlock}
    <h2 style="font-family: ${EMAIL_BRAND.serifFamily}; color: ${EMAIL_BRAND.ink}; margin-top: 24px;">
      Responses
    </h2>
    ${renderResponsesHtml(submission.responses)}
  `;

  return sendOrSkip({
    to: notificationEmail,
    subject: `New ${submission.readingName} booking — ${submission.email}`,
    html: renderEmailShell(inner, 640),
    warnPrefix: "Josephine notification",
  });
}

export async function sendOrderConfirmation(
  submission: SubmissionContext,
): Promise<EmailSendResult> {
  const firstName = escapeHtml(submission.firstName);
  const readingName = escapeHtml(submission.readingName);

  const inner = [
    paragraph(`Hi ${firstName},`),
    paragraph(
      `Thank you for booking a ${readingName} with me. I have your intake and your payment, and you don't need to do anything else.`,
    ),
    paragraph(
      "I'll begin your reading in the next day or two. You'll hear a short note from me when I do, just so you know it's underway. Your voice note and PDF will arrive within seven days, to this email address.",
    ),
    paragraph(
      "If anything comes up before then — a question, a detail you forgot to mention, anything at all — just reply to this email. It comes straight to me.",
    ),
    signOff(),
  ].join("");

  return sendOrSkip({
    to: submission.email,
    subject: "Your reading is booked — here's what happens next",
    html: renderEmailShell(inner),
    warnPrefix: "order confirmation",
  });
}

export async function sendDay2Started(submission: SubmissionContext): Promise<EmailSendResult> {
  const firstName = escapeHtml(submission.firstName);

  const inner = [
    paragraph(`Hi ${firstName},`),
    paragraph(
      "Just a quick note to let you know I've sat down with your chart and your records this week. I always want my clients to know when the work begins, so it doesn't feel like silence on your end.",
    ),
    paragraph(
      "I'm not going to preview anything — your reading should arrive whole, the way it's meant to. But I wanted you to know it's in good hands, and that I'm taking the time it asks for.",
    ),
    paragraph("You'll hear from me again when it's ready, within the next five days."),
    signOff(),
  ].join("");

  return sendOrSkip({
    to: submission.email,
    subject: "A quick note — I've started your reading",
    html: renderEmailShell(inner),
    warnPrefix: "Day +2 started",
  });
}

export async function sendDay7Delivery(
  submission: SubmissionContext,
  listenUrl: string,
): Promise<EmailSendResult> {
  const firstName = escapeHtml(submission.firstName);
  const readingName = escapeHtml(submission.readingName);
  const safeUrl = escapeHtml(listenUrl);

  const inner = [
    paragraph(`Hi ${firstName},`),
    paragraph(`Your ${readingName} is ready. Everything is here:`),
    `<p style="margin: 16px 0;"><a href="${safeUrl}" style="color: ${EMAIL_BRAND.ink}; text-decoration: underline;">${safeUrl}</a></p>`,
    paragraph(
      "The voice note is best with headphones, somewhere quiet. The PDF is yours to keep — print it, save it, mark it up, whatever feels right. Listen in one sitting if you can; some of it lands across a whole afternoon, not all at once.",
    ),
    paragraph(
      "If anything you hear sits hard, or if a question opens up after, please write to me. I'd rather know than not.",
    ),
    signOff(),
  ].join("");

  return sendOrSkip({
    to: submission.email,
    subject: "Your reading is ready",
    html: renderEmailShell(inner),
    warnPrefix: "Day +7 delivery",
  });
}

export type ContactMessage = {
  name: string;
  email: string;
  message: string;
};

export async function sendContactMessage(
  contact: ContactMessage,
): Promise<EmailSendResult> {
  const notificationEmail = process.env.NOTIFICATION_EMAIL;
  if (!notificationEmail) {
    console.warn("[resend] NOTIFICATION_EMAIL not set — skipping contact message");
    return { resendId: null };
  }

  const client = getResendClient();
  if (!client) {
    console.warn("[resend] RESEND_API_KEY not set — skipping contact message");
    return { resendId: null };
  }

  const safeName = escapeHtml(contact.name);
  const safeEmail = escapeHtml(contact.email);
  const safeMessage = escapeHtml(contact.message).replace(/\n/g, "<br/>");

  const inner = `
    <h1 style="font-family: ${EMAIL_BRAND.serifFamily}; color: ${EMAIL_BRAND.ink};">
      New message from ${safeName}
    </h1>
    <p><strong>From:</strong> ${safeName} &lt;${safeEmail}&gt;</p>
    <hr style="border: none; border-top: 1px solid ${EMAIL_BRAND.divider}; margin: 24px 0;" />
    <div style="white-space: pre-wrap;">${safeMessage}</div>
  `;

  const response = await client.emails.send({
    from: FROM_ADDRESS,
    to: notificationEmail,
    replyTo: contact.email,
    subject: `New message from ${contact.name}`,
    html: renderEmailShell(inner, 640),
  });

  return { resendId: response.data?.id ?? null };
}

export async function sendDay7OverdueAlert(submission: SubmissionContext): Promise<EmailSendResult> {
  const notificationEmail = process.env.NOTIFICATION_EMAIL;
  if (!notificationEmail) {
    console.warn("[resend] NOTIFICATION_EMAIL not set — skipping Day +7 overdue alert");
    return { resendId: null };
  }

  const inner = `
    <h1 style="font-family: ${EMAIL_BRAND.serifFamily}; color: ${EMAIL_BRAND.ink};">
      Reading overdue — past 7 days
    </h1>
    <p>The following submission is past the 7-day delivery window and has no <code>deliveredAt</code> set:</p>
    <p><strong>Client:</strong> ${escapeHtml(submission.email)}</p>
    <p><strong>Reading:</strong> ${escapeHtml(submission.readingName)}</p>
    <p><strong>Submission ID:</strong> ${escapeHtml(submission.id)}</p>
    <p><strong>Created:</strong> ${escapeHtml(submission.createdAt)}</p>
    <p style="color: ${EMAIL_BRAND.muted}; font-size: 14px; margin-top: 24px;">
      Mark <code>deliveredAt</code> in Studio after uploading the voice note + PDF to fire the client delivery email.
    </p>
  `;

  return sendOrSkip({
    to: notificationEmail,
    subject: `Reading overdue — ${submission.readingName} for ${submission.email}`,
    html: renderEmailShell(inner, 640),
    warnPrefix: "Day +7 overdue alert",
  });
}
