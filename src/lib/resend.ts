import { Resend } from "resend";

import { escapeHtml } from "./utils";

const FROM_ADDRESS = "Josephine <notifications@withjosephine.com>";

const EMAIL_BRAND = {
  ink: "#1C1935",
  body: "#3D3633",
  muted: "#7A6F6A",
  divider: "#E8D5C4",
  serifFamily: "'Cormorant Garamond', serif",
  sansFamily: "Inter, sans-serif",
} as const;

export type SubmissionResponse = {
  fieldLabelSnapshot: string;
  fieldType: string;
  value: string;
};

export type SubmissionContext = {
  id: string;
  email: string;
  readingName: string;
  readingPriceDisplay: string;
  responses: SubmissionResponse[];
  photoUrl: string | null;
  createdAt: string;
};

let cachedClient: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!cachedClient) cachedClient = new Resend(apiKey);
  return cachedClient;
}

function renderEmailShell(innerHtml: string, maxWidthPx = 640): string {
  return `
    <div style="font-family: ${EMAIL_BRAND.sansFamily}; color: ${EMAIL_BRAND.body}; max-width: ${maxWidthPx}px; line-height: 1.7;">
      ${innerHtml}
    </div>
  `;
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

export async function sendNotificationToJosephine(submission: SubmissionContext): Promise<void> {
  const client = getResendClient();
  if (!client) {
    console.warn("[resend] RESEND_API_KEY not set — skipping Josephine notification");
    return;
  }

  const notificationEmail = process.env.NOTIFICATION_EMAIL;
  if (!notificationEmail) {
    console.warn("[resend] NOTIFICATION_EMAIL not set — skipping Josephine notification");
    return;
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

  await client.emails.send({
    from: FROM_ADDRESS,
    to: notificationEmail,
    subject: `New ${submission.readingName} booking — ${submission.email}`,
    html: renderEmailShell(inner),
  });
}

export async function sendClientConfirmation(submission: SubmissionContext): Promise<void> {
  const client = getResendClient();
  if (!client) {
    console.warn("[resend] RESEND_API_KEY not set — skipping client confirmation");
    return;
  }

  const inner = `
    <h1 style="font-family: ${EMAIL_BRAND.serifFamily}; color: ${EMAIL_BRAND.ink}; font-weight: 400;">
      Your ${escapeHtml(submission.readingName)} is confirmed
    </h1>
    <p>Thank you for booking your ${escapeHtml(submission.readingName)}.</p>
    <p>
      Your reading is being prepared. You'll receive your voice note and PDF
      within 7 days at this email address.
    </p>
    <p style="color: ${EMAIL_BRAND.muted}; font-size: 14px; margin-top: 24px;">
      By submitting your booking you acknowledged that readings are non-refundable
      once work has begun.
    </p>
    <p style="margin-top: 24px;">— Josephine</p>
    <hr style="border: none; border-top: 1px solid ${EMAIL_BRAND.divider}; margin: 32px 0 16px;" />
    <p style="color: ${EMAIL_BRAND.muted}; font-size: 12px;">
      Submission ID: ${escapeHtml(submission.id)}
    </p>
  `;

  await client.emails.send({
    from: FROM_ADDRESS,
    to: submission.email,
    subject: `Your ${submission.readingName} is confirmed`,
    html: renderEmailShell(inner, 560),
  });
}
