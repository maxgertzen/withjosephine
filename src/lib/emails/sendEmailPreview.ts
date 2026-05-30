import "server-only";

import { isPreviewTemplateKey, renderEmailPreview } from "./render-preview";
import { type EmailTemplateKey } from "./slots";

type FetchFn = () => Promise<unknown>;

async function fetchPublishedCopy(template: EmailTemplateKey): Promise<unknown> {
  const fetch = await import("@/lib/sanity/fetch");
  const dispatch: Record<EmailTemplateKey, FetchFn> = {
    emailOrderConfirmation: fetch.fetchEmailOrderConfirmation,
    emailDay7Delivery: fetch.fetchEmailDay7Delivery,
    emailGiftPurchaseConfirmationSelfSend: fetch.fetchEmailGiftPurchaseConfirmationSelfSend,
    emailGiftPurchaseConfirmationScheduled: fetch.fetchEmailGiftPurchaseConfirmationScheduled,
    emailGiftClaim: fetch.fetchEmailGiftClaim,
    emailGiftClaimReminder: fetch.fetchEmailGiftClaimReminder,
    emailMagicLink: fetch.fetchEmailMagicLink,
    emailMagicLinkLibrary: fetch.fetchEmailMagicLinkLibrary,
    emailPrivacyExport: fetch.fetchEmailPrivacyExport,
    emailRecipientIntakeReceived: fetch.fetchEmailRecipientIntakeReceived,
    emailStepUpOtp: fetch.fetchEmailStepUpOtp,
    emailNewDeviceNotice: fetch.fetchEmailNewDeviceNotice,
  };
  return dispatch[template]().catch(() => null);
}

const SUBJECT_PREVIEW_PREFIX = "[PREVIEW] ";

export type SendEmailPreviewResult =
  | { kind: "sent"; resendId: string | null }
  | { kind: "skipped"; reason: string }
  | { kind: "failed"; error: string };

/**
 * Renders the requested email template with PUBLISHED Sanity copy + fixture
 * vars, then sends the result to the recipient via Resend.
 *
 * Subject is prefixed with [PREVIEW] so it cannot be confused with a real
 * customer email if the test recipient is a shared inbox.
 *
 * The recipient is NOT re-validated here; callers MUST check
 * `isAllowedPreviewRecipient` before invoking.
 */
export async function sendEmailPreview(args: {
  template: EmailTemplateKey;
  recipient: string;
}): Promise<SendEmailPreviewResult> {
  if (!isPreviewTemplateKey(args.template)) {
    return { kind: "failed", error: `Unknown template: ${args.template}` };
  }

  const sanityCopy = await fetchPublishedCopy(args.template);
  const html = await renderEmailPreview(args.template, sanityCopy);

  const { Resend } = await import("resend");
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { kind: "skipped", reason: "RESEND_API_KEY not configured" };

  const subject = `${SUBJECT_PREVIEW_PREFIX}${describeTemplate(args.template)}`;

  try {
    const client = new Resend(apiKey);
    const response = await client.emails.send({
      from: "Josephine <hello@withjosephine.com>",
      to: args.recipient,
      subject,
      html,
    });
    const resendId = (response.data as { id?: string } | null)?.id ?? null;
    return { kind: "sent", resendId };
  } catch (error) {
    return {
      kind: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function describeTemplate(template: EmailTemplateKey): string {
  const labels: Partial<Record<EmailTemplateKey, string>> = {
    emailOrderConfirmation: "Order Confirmation",
    emailDay7Delivery: "Reading Delivery (Day 7)",
    emailGiftPurchaseConfirmationSelfSend: "Gift Confirmation (Self-Send)",
    emailGiftPurchaseConfirmationScheduled: "Gift Confirmation (Scheduled)",
    emailGiftClaim: "Gift Claim (First Send)",
    emailGiftClaimReminder: "Gift Claim (Reminder)",
    emailMagicLink: "Magic Link (Listen Page)",
    emailMagicLinkLibrary: "Magic Link (Library)",
    emailPrivacyExport: "Privacy Export (GDPR)",
    emailRecipientIntakeReceived: "Intake Received (Recipient)",
    emailStepUpOtp: "Step-up Code",
    emailNewDeviceNotice: "New Device Notice",
  };
  return labels[template] ?? template;
}
