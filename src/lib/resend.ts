import { Resend } from "resend";

import { isFlagEnabled } from "./env";
import { emailTokens } from "./theme/email-tokens.generated";
import { escapeHtml } from "./utils";

const FROM_ADDRESS = "Josephine <hello@withjosephine.com>";

const EMAIL_BRAND = emailTokens;

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

// File uploads are surfaced as a dedicated "Photo:" link block at the top
// of the notification; consent toggles (e.g. "I don't know my birth time")
// are answered structurally elsewhere in the response set, so listing them
// as "Yes" / "No" rows is noise.
const NOISE_FIELD_TYPES = new Set(["fileUpload", "consent"]);

function renderResponsesHtml(responses: SubmissionResponse[]): string {
  const visible = responses.filter((response) => !NOISE_FIELD_TYPES.has(response.fieldType));
  if (visible.length === 0) return "<p><em>No responses recorded.</em></p>";
  const rows = visible
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
  emailKind: string;
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
    ${submission.amountPaidDisplay
      ? `<p><strong>Amount paid:</strong> ${escapeHtml(submission.amountPaidDisplay)}</p>`
      : ""}
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
    emailKind: "Josephine notification",
  });
}

function renderInsetPrice(
  readingPriceDisplay: string,
  amountPaidDisplay: string | null,
): string {
  // The thank-you page shows the strikethrough-on-discount visual using
  // cents-level comparison (Stripe `amount_total` vs Sanity `reading.price`).
  // Email only has formatted strings, where Intl emits `"$179.00"` while
  // Sanity stores `"$179"` — those never match by string. Rather than thread
  // cents through the email render path, just surface what the customer paid.
  return amountPaidDisplay ?? readingPriceDisplay;
}

function renderOrderConfirmationHtml(args: {
  firstName: string;
  readingName: string;
  readingPriceDisplay: string;
  amountPaidDisplay: string | null;
}): string {
  const { firstName, readingName, readingPriceDisplay, amountPaidDisplay } = args;
  const priceCell = renderInsetPrice(readingPriceDisplay, amountPaidDisplay);
  const priceRow = priceCell
    ? `<span style="color: ${EMAIL_BRAND.muted};">Delivery within 7 days</span>&nbsp;&middot;&nbsp;<span>${priceCell}</span>`
    : `<span style="color: ${EMAIL_BRAND.muted};">Delivery within 7 days</span>`;

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: ${EMAIL_BRAND.warm};">
      <tr><td align="center" style="padding: 48px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background: ${EMAIL_BRAND.cream}; border: 1px solid ${EMAIL_BRAND.divider}; border-radius: 4px;">

          <tr><td align="center" style="padding: 44px 48px 8px 48px;">
            <p style="margin: 0; font-family: ${EMAIL_BRAND.serifFamily}; font-weight: 500; font-size: 38px; color: ${EMAIL_BRAND.ink}; line-height: 1; letter-spacing: 0.005em;">Josephine</p>
            <p style="margin: 10px 0 0 0; font-family: ${EMAIL_BRAND.sansFamily}; font-size: 11px; color: ${EMAIL_BRAND.muted}; letter-spacing: 0.32em; text-transform: uppercase;">Soul Readings</p>
          </td></tr>

          <tr><td align="center" style="padding: 32px 48px 8px 48px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
              <td width="18%"><div style="border-top: 1px solid ${EMAIL_BRAND.gold};"></div></td>
              <td align="center" style="padding: 0 16px; font-family: ${EMAIL_BRAND.serifFamily}; font-weight: 500; font-size: 28px; color: ${EMAIL_BRAND.ink}; line-height: 1.2; white-space: nowrap;">Your reading is booked</td>
              <td width="18%"><div style="border-top: 1px solid ${EMAIL_BRAND.gold};"></div></td>
            </tr></table>
          </td></tr>

          <tr><td style="padding: 32px 48px 16px 48px; font-family: ${EMAIL_BRAND.sansFamily}; color: ${EMAIL_BRAND.body}; line-height: 1.75; font-size: 16px;">
            <p style="margin: 0 0 18px 0;">Hi ${firstName},</p>
            <p style="margin: 0 0 18px 0;">Thank you for booking a ${readingName} with me. I have your intake and your payment, and you don't need to do anything else.</p>
            <p style="margin: 0 0 18px 0;">I'll begin your reading in the next day or two. You'll hear a short note from me when I do, just so you know it's underway. Your voice note and PDF will arrive within seven days, to this email address.</p>
            <p style="margin: 0 0 32px 0;">If anything comes up before then — a question, a detail you forgot to mention, anything at all — just reply to this email. It comes straight to me.</p>
          </td></tr>

          <tr><td style="padding: 0 48px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: ${EMAIL_BRAND.warm}; border-radius: 4px;"><tr>
              <td style="padding: 20px 24px; font-family: ${EMAIL_BRAND.sansFamily}; color: ${EMAIL_BRAND.body};">
                <p style="margin: 0 0 4px 0; font-size: 11px; color: ${EMAIL_BRAND.muted}; letter-spacing: 0.18em; text-transform: uppercase;">Your reading</p>
                <p style="margin: 0 0 12px 0; font-family: ${EMAIL_BRAND.serifFamily}; font-size: 22px; color: ${EMAIL_BRAND.ink};">${readingName}</p>
                <p style="margin: 0; font-size: 14px; color: ${EMAIL_BRAND.body};">${priceRow}</p>
              </td>
            </tr></table>
          </td></tr>

          <tr><td style="padding: 36px 48px 16px 48px; font-family: ${EMAIL_BRAND.serifFamily}; font-style: italic; font-size: 22px; color: ${EMAIL_BRAND.ink}; line-height: 1.4;">
            <p style="margin: 0 0 4px 0;">With love,</p>
            <p style="margin: 0;">Josephine <span style="color: ${EMAIL_BRAND.gold};">✦</span></p>
          </td></tr>

          <tr><td style="padding: 24px 48px 36px 48px; border-top: 1px solid ${EMAIL_BRAND.divider}; font-family: ${EMAIL_BRAND.sansFamily}; font-size: 12px; color: ${EMAIL_BRAND.muted}; line-height: 1.7;">
            <p style="margin: 0;">
              <a href="mailto:hello@withjosephine.com" style="color: ${EMAIL_BRAND.ink}; text-decoration: none;">hello@withjosephine.com</a>
              &nbsp;&middot;&nbsp;
              <a href="https://withjosephine.com" style="color: ${EMAIL_BRAND.ink}; text-decoration: none;">withjosephine.com</a>
            </p>
            <p style="margin: 8px 0 0 0;">Readings are offered for entertainment and personal reflection.</p>
          </td></tr>

        </table>
      </td></tr>
    </table>
  `;
}

export async function sendOrderConfirmation(
  submission: SubmissionContext,
): Promise<EmailSendResult> {
  const html = renderOrderConfirmationHtml({
    firstName: escapeHtml(submission.firstName),
    readingName: escapeHtml(submission.readingName),
    readingPriceDisplay: escapeHtml(submission.readingPriceDisplay),
    amountPaidDisplay: submission.amountPaidDisplay
      ? escapeHtml(submission.amountPaidDisplay)
      : null,
  });

  return sendOrSkip({
    to: submission.email,
    subject: "Your reading is booked — here's what happens next",
    html,
    emailKind: "order confirmation",
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
    emailKind: "Day +2 started",
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
    emailKind: "Day +7 delivery",
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

  return sendOrSkip({
    to: notificationEmail,
    replyTo: contact.email,
    subject: `New message from ${contact.name}`,
    html: renderEmailShell(inner, 640),
    emailKind: "contact message",
  });
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
    emailKind: "Day +7 overdue alert",
  });
}
