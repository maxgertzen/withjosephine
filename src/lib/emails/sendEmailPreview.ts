import "server-only";

import { type EmailSendResult,sendOrSkip } from "@/lib/resend";

import { isPreviewTemplateKey, renderEmailPreview } from "./render-preview";
import { type EmailTemplateKey } from "./slots";

const SUBJECT_PREVIEW_PREFIX = "[PREVIEW] ";

const TEMPLATE_LABELS: Record<EmailTemplateKey, string> = {
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

async function fetchPublishedCopy(template: EmailTemplateKey): Promise<unknown> {
  const fetch = await import("@/lib/sanity/fetch");
  switch (template) {
    case "emailOrderConfirmation":
      return fetch.fetchEmailOrderConfirmation().catch(() => null);
    case "emailDay7Delivery":
      return fetch.fetchEmailDay7Delivery().catch(() => null);
    case "emailGiftPurchaseConfirmationSelfSend":
      return fetch.fetchEmailGiftPurchaseConfirmationSelfSend().catch(() => null);
    case "emailGiftPurchaseConfirmationScheduled":
      return fetch.fetchEmailGiftPurchaseConfirmationScheduled().catch(() => null);
    case "emailGiftClaim":
      return fetch.fetchEmailGiftClaim().catch(() => null);
    case "emailGiftClaimReminder":
      return fetch.fetchEmailGiftClaimReminder().catch(() => null);
    case "emailMagicLink":
      return fetch.fetchEmailMagicLink().catch(() => null);
    case "emailMagicLinkLibrary":
      return fetch.fetchEmailMagicLinkLibrary().catch(() => null);
    case "emailPrivacyExport":
      return fetch.fetchEmailPrivacyExport().catch(() => null);
    case "emailRecipientIntakeReceived":
      return fetch.fetchEmailRecipientIntakeReceived().catch(() => null);
    case "emailStepUpOtp":
      return fetch.fetchEmailStepUpOtp().catch(() => null);
    case "emailNewDeviceNotice":
      return fetch.fetchEmailNewDeviceNotice().catch(() => null);
  }
}

/**
 * Renders the requested template with PUBLISHED Sanity copy + fixture vars,
 * then routes through sendOrSkip so the canonical guards apply (sandbox-prefix,
 * RESEND_DRY_RUN flag, x-e2e-resend-dry-run header, cached client, redacted
 * logging, serverTrack). Subject is [PREVIEW]-prefixed so a test send to a
 * shared inbox can't be confused with a real customer email.
 *
 * Caller MUST validate `recipient` against isAllowedPreviewRecipient first.
 */
export async function sendEmailPreview(args: {
  template: EmailTemplateKey;
  recipient: string;
}): Promise<EmailSendResult> {
  if (!isPreviewTemplateKey(args.template)) {
    return { kind: "failed", error: `Unknown template: ${args.template}` };
  }

  const sanityCopy = await fetchPublishedCopy(args.template);
  const html = await renderEmailPreview(args.template, sanityCopy);
  const subject = `${SUBJECT_PREVIEW_PREFIX}${TEMPLATE_LABELS[args.template]}`;

  return sendOrSkip({
    to: args.recipient,
    subject,
    html,
    subType: "admin_email_preview",
    submissionId: null,
  });
}
