import { render } from "@react-email/render";
import { headers } from "next/headers";
import { Resend } from "resend";

import { generateAnonymousDistinctId, serverTrack } from "./analytics/server";
import { EMAIL_LABELS, type EmailSubType } from "./analytics/server-events";
import { GIFT_DELIVERY } from "./booking/constants";
import { applyTokens } from "./emails/applyTokens";
import { ContactMessage } from "./emails/ContactMessage";
import { Day7Delivery } from "./emails/Day7Delivery";
import { Day7OverdueAlert } from "./emails/Day7OverdueAlert";
import { GiftClaimEmail } from "./emails/GiftClaimEmail";
import { GiftClaimReminderEmail } from "./emails/GiftClaimReminderEmail";
import { GiftPurchaseConfirmationScheduled } from "./emails/GiftPurchaseConfirmationScheduled";
import { GiftPurchaseConfirmationSelfSend } from "./emails/GiftPurchaseConfirmationSelfSend";
import { JosephineNotification } from "./emails/JosephineNotification";
import { MagicLink } from "./emails/MagicLink";
import { OrderConfirmation } from "./emails/OrderConfirmation";
import { PrivacyExport } from "./emails/PrivacyExport";
import { RecipientIntakeReceived } from "./emails/RecipientIntakeReceived";
import { isFlagEnabled, siteOrigin } from "./env";

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

export type EmailSendResult =
  | { kind: "sent"; resendId: string }
  | { kind: "dry_run" }
  | { kind: "skipped"; reason: "no_api_key" | "no_notification_email" }
  | { kind: "failed"; error: string };

// Brand + footer copy shared across every branded template. Sanity edit on
// the `emailSharedShell` singleton propagates to every customer-facing email.
// Falls back to the in-code defaults if the GROQ returns null.
async function fetchSharedShell() {
  const { EMAIL_SHARED_SHELL_DEFAULTS } = await import("@/data/defaults");
  const { fetchEmailSharedShell } = await import("@/lib/sanity/fetch");
  const sanity = await fetchEmailSharedShell().catch(() => null);
  return { ...EMAIL_SHARED_SHELL_DEFAULTS, ...(sanity ?? {}) };
}

export function getResendId(result: EmailSendResult): string | null {
  return result.kind === "sent" ? result.resendId : null;
}

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
 *
 * For local-parts of ≤2 chars (where keeping the first character would leak
 * most of the original), drop the local entirely.
 */
export function redactEmail(address: string) {
  const atIdx = address.indexOf("@");
  if (atIdx < 1) return address;
  const local = address.slice(0, atIdx);
  const domain = address.slice(atIdx);
  if (local.length <= 2) return `***${domain}`;
  return `${local[0]}***${domain}`;
}

function redactRecipient(to: string | string[]) {
  return Array.isArray(to) ? to.map(redactEmail).join(",") : redactEmail(to);
}

type SkipReason = "sandbox_prefix" | "flag" | "header";

// Fail-closed: header present + worker secret unset → skip the send.
// Without this, a runner-only secret silently burns Resend quota per CI run.
async function shouldDryRunFromRequestHeader(): Promise<boolean> {
  try {
    const h = await headers();
    const headerValue = h.get("x-e2e-resend-dry-run");
    if (!headerValue) return false;
    const secret = process.env.RESEND_E2E_DRY_RUN_SECRET;
    if (!secret) {
      console.error(
        "[resend] DRY_RUN_SECRET_UNSET — request carries X-E2E-Resend-DryRun but worker has no RESEND_E2E_DRY_RUN_SECRET configured; skipping the Resend send (fail-closed). Fix: `pnpm exec wrangler secret put RESEND_E2E_DRY_RUN_SECRET --env staging` with the same value as the STAGING_RESEND_E2E_DRY_RUN_SECRET GitHub Actions secret.",
      );
      return true;
    }
    return headerValue === secret;
  } catch {
    return false;
  }
}

// DO alarms, cron sweeps, and the Stripe webhook have no request context,
// so the X-E2E-Resend-DryRun header can't reach them — match by email instead.
const SANDBOX_EMAIL_PREFIXES = [
  "gift-roundtrip-purchaser+",
  "gift-roundtrip-recipient+",
  "gift-recipient-listen-purchaser+",
  "gift-recipient-listen-recipient+",
  "listen-roundtrip+",
  "stripe-roundtrip+",
  "v120-qa+",
] as const;
const SANDBOX_DOMAIN = "@withjosephine.com";

export function isSandboxEmail(address: string | null | undefined): boolean {
  if (!address) return false;
  const lower = address.toLowerCase();
  if (!lower.endsWith(SANDBOX_DOMAIN)) return false;
  return SANDBOX_EMAIL_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

async function sendOrSkip(args: {
  to: string | string[];
  subject: string;
  html: string;
  subType: EmailSubType;
  submissionId: string | null;
  replyTo?: string;
  idempotencyKey?: string;
  // Admin notifications: `to` is always hello@, so check the submission email too.
  originatorEmail?: string | null;
}): Promise<EmailSendResult> {
  const label = EMAIL_LABELS[args.subType];
  const recipientList = Array.isArray(args.to) ? args.to : [args.to];
  const skipReason: SkipReason | null =
    recipientList.some(isSandboxEmail) || isSandboxEmail(args.originatorEmail)
      ? "sandbox_prefix"
      : isFlagEnabled("RESEND_DRY_RUN")
        ? "flag"
        : (await shouldDryRunFromRequestHeader())
          ? "header"
          : null;
  if (skipReason) {
    const captureUrl = process.env.E2E_CAPTURE_URL;
    if (captureUrl) {
      void fetch(`${captureUrl}/_e2e/captured-emails`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label,
          to: args.to,
          subject: args.subject,
          html: args.html,
        }),
      }).catch(() => undefined);
    }
    console.warn(
      `[resend] RESEND_DRY_RUN — skipping ${label} (reason=${skipReason}, to=${redactRecipient(args.to)})`,
    );
    return { kind: "dry_run" };
  }
  const client = getResendClient();
  if (!client) {
    console.warn(`[resend] RESEND_API_KEY not set — skipping ${label}`);
    return { kind: "skipped", reason: "no_api_key" };
  }
  let resendId: string | null;
  try {
    const response = await client.emails.send(
      {
        from: FROM_ADDRESS,
        to: args.to,
        subject: args.subject,
        html: args.html,
        ...(args.replyTo ? { replyTo: args.replyTo } : {}),
      },
      args.idempotencyKey ? { idempotencyKey: args.idempotencyKey } : undefined,
    );
    resendId = response.data?.id ?? null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[resend] send failed for ${label}: ${message}`);
    return { kind: "failed", error: message };
  }

  void serverTrack("email_sent", {
    distinct_id: args.submissionId ?? generateAnonymousDistinctId(),
    sub_type: args.subType,
    submission_id: args.submissionId,
    recipient_redacted: redactRecipient(args.to),
    resend_id_present: resendId !== null,
  });

  if (resendId === null) {
    return { kind: "failed", error: "Resend returned no id" };
  }
  return { kind: "sent", resendId };
}

function requireNotificationEmail(subType: EmailSubType): string | EmailSendResult {
  const notificationEmail = process.env.NOTIFICATION_EMAIL;
  if (!notificationEmail) {
    console.warn(`[resend] NOTIFICATION_EMAIL not set — skipping ${EMAIL_LABELS[subType]}`);
    return { kind: "skipped", reason: "no_notification_email" };
  }
  return notificationEmail;
}

export async function sendNotificationToJosephine(
  submission: SubmissionContext,
): Promise<EmailSendResult> {
  const notificationEmail = requireNotificationEmail("josephine_notification");
  if (typeof notificationEmail !== "string") return notificationEmail;

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
    subType: "josephine_notification",
    submissionId: submission.id,
    originatorEmail: submission.email,
  });
}

export type RecipientIntakeReceivedInput = {
  submissionId: string;
  recipientEmail: string;
  recipientName: string;
  purchaserFirstName: string;
  readingName: string;
};

export async function sendRecipientIntakeReceived(
  input: RecipientIntakeReceivedInput,
): Promise<EmailSendResult> {
  const [{ EMAIL_RECIPIENT_INTAKE_RECEIVED_DEFAULTS }, { fetchEmailRecipientIntakeReceived }] =
    await Promise.all([import("@/data/defaults"), import("@/lib/sanity/fetch")]);
  const [sanity, shell] = await Promise.all([
    fetchEmailRecipientIntakeReceived().catch(() => null),
    fetchSharedShell(),
  ]);
  const copy = { ...EMAIL_RECIPIENT_INTAKE_RECEIVED_DEFAULTS, ...(sanity ?? {}) };
  const html = await render(
    <RecipientIntakeReceived
      vars={{
        recipientName: input.recipientName,
        purchaserFirstName: input.purchaserFirstName,
        readingName: input.readingName,
      }}
      copy={copy}
      shell={shell}
    />,
  );
  const subject = applyTokens(copy.subject, {
    recipientName: input.recipientName,
    readingName: input.readingName,
  });
  return sendOrSkip({
    to: input.recipientEmail,
    subject,
    html,
    subType: "recipient_intake_received",
    submissionId: input.submissionId,
  });
}

export async function sendOrderConfirmation(
  submission: SubmissionContext,
): Promise<EmailSendResult> {
  const { EMAIL_ORDER_CONFIRMATION_DEFAULTS } = await import("@/data/defaults");
  const { fetchEmailOrderConfirmation } = await import("@/lib/sanity/fetch");
  const [sanity, shell] = await Promise.all([
    fetchEmailOrderConfirmation().catch(() => null),
    fetchSharedShell(),
  ]);
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
      shell={shell}
    />,
  );

  return sendOrSkip({
    to: submission.email,
    subject: copy.subject,
    html,
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
  const {
    EMAIL_GIFT_PURCHASE_CONFIRMATION_SELF_SEND_DEFAULTS,
    EMAIL_GIFT_PURCHASE_CONFIRMATION_SCHEDULED_DEFAULTS,
  } = await import("@/data/defaults");
  const {
    fetchEmailGiftPurchaseConfirmationScheduled,
    fetchEmailGiftPurchaseConfirmationSelfSend,
  } = await import("@/lib/sanity/fetch");
  const myGiftsUrl = `${siteOrigin()}/my-gifts`;

  let html: string;
  let interpolatedSubject: string;
  if (input.variant === GIFT_DELIVERY.selfSend) {
    const [sanity, shell] = await Promise.all([
      fetchEmailGiftPurchaseConfirmationSelfSend().catch(() => null),
      fetchSharedShell(),
    ]);
    const copy = { ...EMAIL_GIFT_PURCHASE_CONFIRMATION_SELF_SEND_DEFAULTS, ...(sanity ?? {}) };
    interpolatedSubject = applyTokens(copy.subject, {
      recipientName: input.recipientName ?? "your recipient",
    });
    html = await render(
      <GiftPurchaseConfirmationSelfSend
        vars={{
          claimUrl: input.claimUrl,
          purchaserFirstName: input.purchaserFirstName,
          readingName: input.readingName,
          readingPriceDisplay: input.readingPriceDisplay,
          amountPaidDisplay: input.amountPaidDisplay,
          recipientName: input.recipientName,
          giftMessage: input.giftMessage,
          myGiftsUrl,
        }}
        copy={copy}
        shell={shell}
      />,
    );
  } else {
    const [sanity, shell] = await Promise.all([
      fetchEmailGiftPurchaseConfirmationScheduled().catch(() => null),
      fetchSharedShell(),
    ]);
    const copy = { ...EMAIL_GIFT_PURCHASE_CONFIRMATION_SCHEDULED_DEFAULTS, ...(sanity ?? {}) };
    interpolatedSubject = applyTokens(copy.subject, {
      recipientName: input.recipientName ?? "your recipient",
      sendAtDisplay: input.sendAtDisplay,
    });
    html = await render(
      <GiftPurchaseConfirmationScheduled
        vars={{
          sendAtDisplay: input.sendAtDisplay,
          purchaserFirstName: input.purchaserFirstName,
          readingName: input.readingName,
          readingPriceDisplay: input.readingPriceDisplay,
          amountPaidDisplay: input.amountPaidDisplay,
          recipientName: input.recipientName,
          giftMessage: input.giftMessage,
          myGiftsUrl,
        }}
        copy={copy}
        shell={shell}
      />,
    );
  }

  return sendOrSkip({
    to: input.purchaserEmail,
    subject: interpolatedSubject,
    html,
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
  readingPriceDisplay: string;
  giftMessage: string | null;
  idempotencyKey?: string;
} & (
  | { variant: "first_send"; claimUrl: string }
  | { variant: "reminder"; claimUrl?: never }
);

export async function sendGiftClaimEmail(input: GiftClaimEmailInput): Promise<EmailSendResult> {
  const { EMAIL_GIFT_CLAIM_DEFAULTS, EMAIL_GIFT_CLAIM_REMINDER_DEFAULTS } = await import(
    "@/data/defaults"
  );
  const { fetchEmailGiftClaim, fetchEmailGiftClaimReminder } = await import("@/lib/sanity/fetch");

  const shared = {
    recipientName: input.recipientName,
    purchaserFirstName: input.purchaserFirstName,
    readingName: input.readingName,
    readingPriceDisplay: input.readingPriceDisplay,
    giftMessage: input.giftMessage,
  };

  let html: string;
  let interpolatedSubject: string;
  if (input.variant === "first_send") {
    const [sanity, shell] = await Promise.all([
      fetchEmailGiftClaim().catch(() => null),
      fetchSharedShell(),
    ]);
    const copy = { ...EMAIL_GIFT_CLAIM_DEFAULTS, ...(sanity ?? {}) };
    interpolatedSubject = applyTokens(copy.subjectFirstSend, {
      purchaserFirstName: input.purchaserFirstName,
      readingName: input.readingName,
      readingPriceDisplay: input.readingPriceDisplay,
    });
    html = await render(
      <GiftClaimEmail vars={{ ...shared, claimUrl: input.claimUrl }} copy={copy} shell={shell} />,
    );
  } else {
    const [sanity, shell] = await Promise.all([
      fetchEmailGiftClaimReminder().catch(() => null),
      fetchSharedShell(),
    ]);
    const copy = { ...EMAIL_GIFT_CLAIM_REMINDER_DEFAULTS, ...(sanity ?? {}) };
    interpolatedSubject = applyTokens(copy.subject, {
      purchaserFirstName: input.purchaserFirstName,
      readingName: input.readingName,
      readingPriceDisplay: input.readingPriceDisplay,
    });
    html = await render(<GiftClaimReminderEmail vars={shared} copy={copy} shell={shell} />);
  }

  return sendOrSkip({
    to: input.recipientEmail,
    subject: interpolatedSubject,
    html,
    subType: "gift_claim",
    submissionId: input.submissionId,
    idempotencyKey: input.idempotencyKey,
  });
}

export async function sendDay7Delivery(
  submission: SubmissionContext,
  listenUrl: string,
): Promise<EmailSendResult> {
  // Lazy imports scope the Sanity fetch to test runs that don't mock it.
  const { EMAIL_DAY7_DELIVERY_DEFAULTS } = await import("@/data/defaults");
  const { fetchEmailDay7Delivery } = await import("@/lib/sanity/fetch");
  const [sanity, shell] = await Promise.all([
    fetchEmailDay7Delivery().catch(() => null),
    fetchSharedShell(),
  ]);
  const copy = { ...EMAIL_DAY7_DELIVERY_DEFAULTS, ...(sanity ?? {}) };
  const subject = applyTokens(copy.subjectTemplate, {
    readingName: submission.readingName,
    readingPriceDisplay: submission.readingPriceDisplay,
  });
  const html = await render(
    <Day7Delivery
      vars={{
        firstName: submission.firstName,
        readingName: submission.readingName,
        listenUrl,
      }}
      copy={copy}
      shell={shell}
    />,
  );
  return sendOrSkip({
    to: submission.email,
    subject,
    html,
    subType: "day_7_delivery",
    submissionId: submission.id,
  });
}

export type MagicLinkContext = "listen" | "my-readings" | "my-gifts";

export async function sendMagicLink(args: {
  to: string;
  magicLinkUrl: string;
  context: MagicLinkContext;
}): Promise<EmailSendResult> {
  // Lazy imports scope the Sanity fetch to test runs that don't mock it.
  const {
    EMAIL_MAGIC_LINK_DEFAULTS,
    EMAIL_MAGIC_LINK_MY_READINGS_DEFAULTS,
    EMAIL_MAGIC_LINK_MY_GIFTS_DEFAULTS,
  } = await import("@/data/defaults");
  const { fetchEmailMagicLink, fetchEmailMagicLinkMyReadings, fetchEmailMagicLinkMyGifts } =
    await import("@/lib/sanity/fetch");

  const sources = {
    listen: { defaults: EMAIL_MAGIC_LINK_DEFAULTS, fetch: fetchEmailMagicLink, subType: "magic_link" as const },
    "my-readings": {
      defaults: EMAIL_MAGIC_LINK_MY_READINGS_DEFAULTS,
      fetch: fetchEmailMagicLinkMyReadings,
      subType: "magic_link_my_readings" as const,
    },
    "my-gifts": {
      defaults: EMAIL_MAGIC_LINK_MY_GIFTS_DEFAULTS,
      fetch: fetchEmailMagicLinkMyGifts,
      subType: "magic_link_my_gifts" as const,
    },
  };
  const source = sources[args.context];
  const [sanity, shell] = await Promise.all([
    source.fetch().catch(() => null),
    fetchSharedShell(),
  ]);
  const copy = { ...source.defaults, ...(sanity ?? {}) };
  const html = await render(
    <MagicLink
      magicLinkUrl={args.magicLinkUrl}
      preview={copy.preview}
      heroLine={copy.heroLine}
      buttonLabel={copy.buttonLabel}
      greeting={copy.greeting}
      body={copy.body}
      shell={shell}
    />,
  );
  return sendOrSkip({
    to: args.to,
    subject: copy.subject,
    html,
    subType: source.subType,
    submissionId: null,
  });
}

export async function sendPrivacyExportEmail(args: {
  to: string;
  downloadUrl: string;
  submissionCount: number;
  expiryDays: number;
}): Promise<EmailSendResult> {
  const { EMAIL_PRIVACY_EXPORT_DEFAULTS } = await import("@/data/defaults");
  const { fetchEmailPrivacyExport } = await import("@/lib/sanity/fetch");
  const [sanity, shell] = await Promise.all([
    fetchEmailPrivacyExport().catch(() => null),
    fetchSharedShell(),
  ]);
  const copy = { ...EMAIL_PRIVACY_EXPORT_DEFAULTS, ...(sanity ?? {}) };
  const html = await render(
    <PrivacyExport
      vars={{
        downloadUrl: args.downloadUrl,
        submissionCount: args.submissionCount,
        expiryDays: args.expiryDays,
      }}
      copy={copy}
      shell={shell}
    />,
  );
  return sendOrSkip({
    to: args.to,
    subject: copy.subject,
    html,
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
  const notificationEmail = requireNotificationEmail("contact_form");
  if (typeof notificationEmail !== "string") return notificationEmail;

  const html = await render(
    <ContactMessage name={contact.name} email={contact.email} message={contact.message} />,
  );

  return sendOrSkip({
    to: notificationEmail,
    replyTo: contact.email,
    subject: `New message from ${contact.name}`,
    html,
    subType: "contact_form",
    submissionId: null,
    originatorEmail: contact.email,
  });
}

export async function sendDay7OverdueAlert(submission: SubmissionContext): Promise<EmailSendResult> {
  const notificationEmail = requireNotificationEmail("day_7_overdue_alert");
  if (typeof notificationEmail !== "string") return notificationEmail;

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
    subType: "day_7_overdue_alert",
    submissionId: submission.id,
    originatorEmail: submission.email,
  });
}
