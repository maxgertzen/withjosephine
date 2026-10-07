import { render } from "@react-email/render";
import { headers } from "next/headers";
import { type ErrorResponse, Resend, type WebhookEventPayload } from "resend";

import { generateAnonymousDistinctId, serverTrack } from "./analytics/server";
import { EMAIL_LABELS, type EmailSubType } from "./analytics/server-events";
import { isSandboxEmail } from "./booking/sandboxEmails";
import {
  type CustomerEmailType,
  type EmailFiredType,
  FIRST_NAME_FALLBACK,
  type RenderedEmail,
} from "./booking/submissions";
import { applyTokens } from "./emails/applyTokens";
import { ContactMessage } from "./emails/ContactMessage";
import { GiftOpened, type GiftOpenedVars } from "./emails/GiftOpened";
import { GiftPurchase, type GiftPurchaseVars } from "./emails/GiftPurchase";
import {
  GiftRecipientConfirmation,
  giftRecipientConfirmationTokens,
} from "./emails/GiftRecipientConfirmation";
import { GiftToRecipient, giftToRecipientTokens } from "./emails/GiftToRecipient";
import {
  JosephineNotification,
  josephineNotificationTitle,
} from "./emails/JosephineNotification";
import { MagicLink } from "./emails/MagicLink";
import { OrderConfirmation } from "./emails/OrderConfirmation";
import { PrivacyExport } from "./emails/PrivacyExport";
import { ReadingDelivery } from "./emails/ReadingDelivery";
import { ReadingOverdueAlert } from "./emails/ReadingOverdueAlert";
import { isFlagEnabled, isStagingEnvironment } from "./env";
import { giftClientReferenceId } from "./gift/clientReference";
import { formatGiftCode } from "./gift/giftCodeFormat";
import type { GiftEmailFiredType } from "./gift/types";
import { pickDefined } from "./sanity/pickDefined";

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
  | { kind: "skipped"; reason: "no_api_key" | "no_notification_email" | "env_guard" }
  | { kind: "failed"; error: string; statusCode?: number | null };

// Brand + footer copy shared across every branded template. Sanity edit on
// the `emailSharedShell` singleton propagates to every customer-facing email.
// Falls back to the in-code defaults if the GROQ returns null.
async function fetchSharedShell() {
  const { EMAIL_SHARED_SHELL_DEFAULTS } = await import("@/data/defaults");
  const { fetchEmailSharedShell } = await import("@/lib/sanity/fetch");
  const sanity = await fetchEmailSharedShell().catch(() => null);
  return { ...EMAIL_SHARED_SHELL_DEFAULTS, ...pickDefined(sanity ?? {}) };
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

export function verifyResendWebhook(args: {
  payload: string;
  headers: { id: string; timestamp: string; signature: string };
  webhookSecret: string;
}): WebhookEventPayload {
  const client = getResendClient();
  if (!client) throw new Error("RESEND_API_KEY missing");
  return client.webhooks.verify(args);
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

type SkipReason = "sandbox_prefix" | "env_guard" | "flag" | "header";

function deliberateDryRunReason(
  recipients: readonly string[],
  originatorEmail: string | null,
): "sandbox_prefix" | "flag" | null {
  if (recipients.some(isSandboxEmail) || isSandboxEmail(originatorEmail)) {
    return "sandbox_prefix";
  }
  return isFlagEnabled("RESEND_DRY_RUN") ? "flag" : null;
}

function blockedByEnvGuard(recipients: readonly string[]): boolean {
  return !isProductionEnv() && !recipients.every(isProductionAllowlistedRecipient);
}

function configuredSkipReason(
  recipients: readonly string[],
  originatorEmail: string | null,
): Exclude<SkipReason, "header"> | null {
  return (
    deliberateDryRunReason(recipients, originatorEmail) ??
    (blockedByEnvGuard(recipients) ? "env_guard" : null)
  );
}

async function resolveSkipReason(
  recipients: readonly string[],
  originatorEmail: string | null,
): Promise<SkipReason | null> {
  const deliberate = deliberateDryRunReason(recipients, originatorEmail);
  if (deliberate) return deliberate;
  if (await shouldDryRunFromRequestHeader()) return "header";
  if (blockedByEnvGuard(recipients)) {
    console.warn(
      `[resend] env_guard fired in non-production env (NEXT_PUBLIC_SANITY_DATASET=${process.env.NEXT_PUBLIC_SANITY_DATASET ?? "<unset>"}). Recipient(s) ${recipients.map(redactEmail).join(",")} not on sandbox-prefix list nor production allowlist. Skipping send (fail-closed). Add a prefix entry to src/lib/booking/sandboxEmails.ts for test specs, or use a recipient already on the production allowlist for staging smoke.`,
    );
    return "env_guard";
  }
  return null;
}

function isProductionEnv(): boolean {
  return process.env.NEXT_PUBLIC_SANITY_DATASET === "production";
}

export function isDryRunRecipient(recipient: string): boolean {
  return configuredSkipReason([recipient], null) !== null;
}

export const CUSTOMER_EMAIL_TAG = {
  submissionId: "submission_id",
  emailType: "email_type",
} as const;

function customerEmailTags(submissionId: string, emailType: CustomerEmailType) {
  return {
    [CUSTOMER_EMAIL_TAG.submissionId]: submissionId,
    [CUSTOMER_EMAIL_TAG.emailType]: emailType,
  };
}

export const GIFT_EMAIL_TAG = {
  giftId: "gift_id",
  emailType: CUSTOMER_EMAIL_TAG.emailType,
} as const;

function giftEmailTags(giftId: string, emailType: GiftEmailFiredType) {
  return { [GIFT_EMAIL_TAG.giftId]: giftId, [GIFT_EMAIL_TAG.emailType]: emailType };
}

const PRODUCTION_RECIPIENT_ALLOWLIST: ReadonlyArray<string> = [
  "hello@withjosephine.com",
  "maxgertzen@gmail.com",
  "mgertzen2@gmail.com",
  "beckyridgley1@gmail.com",
  "beckyridgley@hotmail.co.uk",
  "delivered@resend.dev",
  "bounced@resend.dev",
  "complained@resend.dev",
  "suppressed@resend.dev",
];

export function isProductionAllowlistedRecipient(
  addr: string | null | undefined,
): boolean {
  if (!addr) return false;
  const lower = addr.toLowerCase().trim();
  const withoutPlus = lower.replace(/\+[^@]*(?=@)/, "");
  const staticList = PRODUCTION_RECIPIENT_ALLOWLIST;
  if (staticList.includes(lower) || staticList.includes(withoutPlus)) return true;
  const notif = process.env.NOTIFICATION_EMAIL?.toLowerCase().trim();
  if (notif && notif === lower) return true;
  return false;
}

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

const STAGING_SUBJECT_PREFIX = "[Staging] ";

function subjectForEnvironment(subject: string): string {
  return isStagingEnvironment() ? `${STAGING_SUBJECT_PREFIX}${subject}` : subject;
}

export async function sendOrSkip(args: {
  to: string | string[];
  subject: string;
  html: string;
  subType: EmailSubType;
  submissionId: string | null;
  giftId?: string;
  replyTo?: string;
  idempotencyKey?: string;
  tags?: Record<string, string>;
  // Admin notifications: `to` is always hello@, so check the submission email too.
  originatorEmail?: string | null;
}): Promise<EmailSendResult> {
  const label = EMAIL_LABELS[args.subType];
  const subject = subjectForEnvironment(args.subject);
  const recipientList = Array.isArray(args.to) ? args.to : [args.to];
  const skipReason = await resolveSkipReason(recipientList, args.originatorEmail ?? null);
  if (skipReason) {
    const captureUrl = process.env.E2E_CAPTURE_URL;
    if (captureUrl) {
      void fetch(`${captureUrl}/_e2e/captured-emails`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label,
          to: args.to,
          subject,
          html: args.html,
        }),
      }).catch(() => undefined);
    }
    console.warn(
      `[resend] RESEND_DRY_RUN — skipping ${label} (reason=${skipReason}, to=${redactRecipient(args.to)})`,
    );
    return skipReason === "env_guard" ? { kind: "skipped", reason: "env_guard" } : { kind: "dry_run" };
  }
  const client = getResendClient();
  if (!client) {
    console.warn(`[resend] RESEND_API_KEY not set — skipping ${label}`);
    return { kind: "skipped", reason: "no_api_key" };
  }
  let resendId: string | null;
  let resendError: ErrorResponse | null;
  try {
    const response = await client.emails.send(
      {
        from: FROM_ADDRESS,
        to: args.to,
        subject,
        html: args.html,
        ...(args.replyTo ? { replyTo: args.replyTo } : {}),
        ...(args.tags
          ? { tags: Object.entries(args.tags).map(([name, value]) => ({ name, value })) }
          : {}),
      },
      args.idempotencyKey ? { idempotencyKey: args.idempotencyKey } : undefined,
    );
    resendId = response.data?.id ?? null;
    resendError = response.error;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[resend] send failed for ${label}: ${message}`);
    return { kind: "failed", error: message };
  }

  void serverTrack("email_sent", {
    distinct_id:
      args.submissionId ??
      (args.giftId ? giftClientReferenceId(args.giftId) : generateAnonymousDistinctId()),
    sub_type: args.subType,
    submission_id: args.submissionId,
    ...(args.giftId ? { gift_id: args.giftId } : {}),
    recipient_redacted: redactRecipient(args.to),
    resend_id_present: resendId !== null,
  });

  if (resendId === null) {
    console.error(
      `[resend] send failed for ${label}: ${resendError?.name ?? "no id"} (${resendError?.statusCode ?? "no status"})`,
    );
    return {
      kind: "failed",
      error: resendError?.name ?? "Resend returned no id",
      statusCode: resendError?.statusCode ?? null,
    };
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
  options?: { idempotencyKey?: string; giftBuyerFirstName?: string },
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
      giftBuyerFirstName={options?.giftBuyerFirstName}
    />,
  );

  return sendOrSkip({
    to: notificationEmail,
    subject: `${josephineNotificationTitle(submission.readingName, options?.giftBuyerFirstName)} — ${submission.email}`,
    html,
    subType: "josephine_notification",
    submissionId: submission.id,
    originatorEmail: submission.email,
    idempotencyKey: options?.idempotencyKey,
  });
}

export async function sendOrderConfirmation(
  submission: SubmissionContext,
  options?: { dataExportUrl?: string; idempotencyKey?: string },
): Promise<EmailSendResult> {
  const { EMAIL_ORDER_CONFIRMATION_DEFAULTS } = await import("@/data/defaults");
  const { fetchEmailOrderConfirmation } = await import("@/lib/sanity/fetch");
  const [sanity, shell] = await Promise.all([
    fetchEmailOrderConfirmation().catch(() => null),
    fetchSharedShell(),
  ]);
  const copy = { ...EMAIL_ORDER_CONFIRMATION_DEFAULTS, ...pickDefined(sanity ?? {}) };
  const html = await render(
    <OrderConfirmation
      vars={{
        firstName: submission.firstName,
        readingName: submission.readingName,
        readingPriceDisplay: submission.readingPriceDisplay,
        amountPaidDisplay: submission.amountPaidDisplay,
        dataExportUrl: options?.dataExportUrl ?? null,
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
    idempotencyKey: options?.idempotencyKey,
    tags: customerEmailTags(submission.id, "order_confirmation"),
  });
}

export async function sendGiftRecipientConfirmation(
  submission: SubmissionContext,
  options: { buyerFirstName: string; dataExportUrl?: string; idempotencyKey?: string },
): Promise<EmailSendResult> {
  const { EMAIL_GIFT_RECIPIENT_CONFIRMATION_DEFAULTS } = await import("@/data/defaults");
  const { fetchEmailGiftRecipientConfirmation } = await import("@/lib/sanity/fetch");
  const [sanity, shell] = await Promise.all([
    fetchEmailGiftRecipientConfirmation().catch(() => null),
    fetchSharedShell(),
  ]);
  const copy = { ...EMAIL_GIFT_RECIPIENT_CONFIRMATION_DEFAULTS, ...pickDefined(sanity ?? {}) };
  const vars = {
    firstName: submission.firstName,
    buyerFirstName: options.buyerFirstName,
    readingName: submission.readingName,
    dataExportUrl: options.dataExportUrl ?? null,
  };
  const html = await render(<GiftRecipientConfirmation vars={vars} copy={copy} shell={shell} />);

  return sendOrSkip({
    to: submission.email,
    subject: applyTokens(copy.subject, giftRecipientConfirmationTokens(vars, copy)),
    html,
    subType: "gift_recipient_confirmation",
    submissionId: submission.id,
    idempotencyKey: options.idempotencyKey,
    tags: customerEmailTags(submission.id, "order_confirmation"),
  });
}

export type CustomerConfirmationSend = {
  firedType: Extract<EmailFiredType, "order_confirmation" | "gift_recipient_confirmation">;
  result: EmailSendResult;
};

export async function sendCustomerConfirmation(
  submission: SubmissionContext,
  options: { dataExportUrl?: string; idempotencyKey: string; giftBuyerFirstName?: string },
): Promise<CustomerConfirmationSend> {
  const { dataExportUrl, idempotencyKey, giftBuyerFirstName } = options;
  if (giftBuyerFirstName === undefined) {
    return {
      firedType: "order_confirmation",
      result: await sendOrderConfirmation(submission, { dataExportUrl, idempotencyKey }),
    };
  }
  return {
    firedType: "gift_recipient_confirmation",
    result: await sendGiftRecipientConfirmation(submission, {
      buyerFirstName: giftBuyerFirstName,
      dataExportUrl,
      idempotencyKey,
    }),
  };
}

export async function sendReadingDelivery(
  submission: SubmissionContext,
  listenUrl: string,
  options?: { idempotencyKey?: string },
): Promise<EmailSendResult> {
  const rendered = await renderReadingDelivery(submission, listenUrl);
  return sendRenderedReadingDelivery(submission, rendered, options);
}

export async function sendRenderedReadingDelivery(
  submission: Pick<SubmissionContext, "id" | "email">,
  rendered: RenderedEmail,
  options?: { idempotencyKey?: string },
): Promise<EmailSendResult> {
  return sendOrSkip({
    to: submission.email,
    subject: rendered.subject,
    html: rendered.html,
    subType: "reading_delivery",
    submissionId: submission.id,
    idempotencyKey: options?.idempotencyKey,
    tags: customerEmailTags(submission.id, "reading_delivery"),
  });
}

export async function renderReadingDelivery(
  submission: SubmissionContext,
  listenUrl: string,
): Promise<RenderedEmail> {
  // Lazy imports scope the Sanity fetch to test runs that don't mock it.
  const { EMAIL_READING_DELIVERY_DEFAULTS } = await import("@/data/defaults");
  const { fetchEmailReadingDelivery } = await import("@/lib/sanity/fetch");
  const [sanity, shell] = await Promise.all([
    fetchEmailReadingDelivery().catch(() => null),
    fetchSharedShell(),
  ]);
  const copy = { ...EMAIL_READING_DELIVERY_DEFAULTS, ...pickDefined(sanity ?? {}) };
  const subject = applyTokens(copy.subjectTemplate, {
    readingName: submission.readingName,
    readingPriceDisplay: submission.readingPriceDisplay,
  });
  const html = await render(
    <ReadingDelivery
      vars={{
        firstName: submission.firstName,
        readingName: submission.readingName,
        listenUrl,
      }}
      copy={copy}
      shell={shell}
    />,
  );
  return { subject, html };
}

export async function sendGiftPurchase(
  { to, ...vars }: GiftPurchaseVars & { to: string },
  options: { giftId: string; idempotencyKey: string },
): Promise<EmailSendResult> {
  const { EMAIL_GIFT_PURCHASE_DEFAULTS } = await import("@/data/defaults");
  const { fetchEmailGiftPurchase } = await import("@/lib/sanity/fetch");
  const [sanity, shell] = await Promise.all([
    fetchEmailGiftPurchase().catch(() => null),
    fetchSharedShell(),
  ]);
  const copy = { ...EMAIL_GIFT_PURCHASE_DEFAULTS, ...pickDefined(sanity ?? {}) };
  const html = await render(<GiftPurchase vars={vars} copy={copy} shell={shell} />);
  return sendOrSkip({
    to,
    subject: applyTokens(copy.subject, { firstName: vars.firstName, readingName: vars.readingName }),
    html,
    subType: "gift_confirmation",
    submissionId: null,
    giftId: options.giftId,
    idempotencyKey: options.idempotencyKey,
    tags: giftEmailTags(options.giftId, "gift_confirmation"),
  });
}

export async function sendGiftOpened(
  { to, ...vars }: GiftOpenedVars & { to: string },
  options: { giftId: string; idempotencyKey: string },
): Promise<EmailSendResult> {
  const { EMAIL_GIFT_OPENED_DEFAULTS } = await import("@/data/defaults");
  const { fetchEmailGiftOpened } = await import("@/lib/sanity/fetch");
  const [sanity, shell] = await Promise.all([
    fetchEmailGiftOpened().catch(() => null),
    fetchSharedShell(),
  ]);
  const copy = { ...EMAIL_GIFT_OPENED_DEFAULTS, ...pickDefined(sanity ?? {}) };
  const html = await render(<GiftOpened vars={vars} copy={copy} shell={shell} />);
  return sendOrSkip({
    to,
    subject: applyTokens(copy.subjectTemplate, vars),
    html,
    subType: "gift_opened",
    submissionId: null,
    giftId: options.giftId,
    idempotencyKey: options.idempotencyKey,
    tags: giftEmailTags(options.giftId, "gift_opened"),
  });
}

export async function sendGiftToRecipient(
  gift: {
    giftId: string;
    recipientName: string;
    recipientEmail: string;
    buyerName: string;
    buyerEmail: string;
    note: string | null;
    readingName: string;
    code: string;
    giftUrl: string;
  },
  options: { idempotencyKey: string },
): Promise<EmailSendResult> {
  const { EMAIL_GIFT_TO_RECIPIENT_DEFAULTS } = await import("@/data/defaults");
  const { fetchEmailGiftToRecipient } = await import("@/lib/sanity/fetch");
  const [sanity, shell] = await Promise.all([
    fetchEmailGiftToRecipient().catch(() => null),
    fetchSharedShell(),
  ]);
  const copy = { ...EMAIL_GIFT_TO_RECIPIENT_DEFAULTS, ...pickDefined(sanity ?? {}) };
  const vars = {
    firstName: gift.recipientName,
    buyerName: gift.buyerName,
    readingName: gift.readingName,
    displayCode: formatGiftCode(gift.code),
    giftUrl: gift.giftUrl,
    note: gift.note,
  };
  const html = await render(<GiftToRecipient vars={vars} copy={copy} shell={shell} />);
  return sendOrSkip({
    to: gift.recipientEmail,
    subject: applyTokens(copy.subject, giftToRecipientTokens(vars)),
    html,
    subType: "gift_send",
    submissionId: null,
    giftId: gift.giftId,
    idempotencyKey: options.idempotencyKey,
    tags: giftEmailTags(gift.giftId, "gift_send"),
    originatorEmail: gift.buyerEmail,
  });
}

export async function sendMagicLink(args: {
  to: string;
  magicLinkUrl: string;
  firstName?: string;
  readingName?: string;
  readingPriceDisplay?: string;
}): Promise<EmailSendResult> {
  // Lazy imports scope the Sanity fetch to test runs that don't mock it.
  const { EMAIL_MAGIC_LINK_DEFAULTS } = await import("@/data/defaults");
  const { fetchEmailMagicLink } = await import("@/lib/sanity/fetch");

  const [sanity, shell] = await Promise.all([
    fetchEmailMagicLink().catch(() => null),
    fetchSharedShell(),
  ]);
  const copy = { ...EMAIL_MAGIC_LINK_DEFAULTS, ...pickDefined(sanity ?? {}) };
  const vars = {
    magicLinkUrl: args.magicLinkUrl,
    firstName: args.firstName ?? FIRST_NAME_FALLBACK,
    readingName: args.readingName ?? "",
    readingPriceDisplay: args.readingPriceDisplay ?? "",
  };
  const subject = applyTokens(copy.subject, vars);
  const html = await render(
    <MagicLink
      vars={vars}
      copy={{
        preview: copy.preview,
        heroLine: copy.heroLine,
        buttonLabel: copy.buttonLabel,
        body: copy.body,
      }}
      shell={shell}
    />,
  );
  return sendOrSkip({
    to: args.to,
    subject,
    html,
    subType: "magic_link",
    submissionId: null,
  });
}

export async function sendPrivacyExportEmail(args: {
  to: string;
  firstName: string;
  downloadUrl: string;
  expiryDays: number;
}): Promise<EmailSendResult> {
  const { EMAIL_PRIVACY_EXPORT_DEFAULTS } = await import("@/data/defaults");
  const { fetchEmailPrivacyExport } = await import("@/lib/sanity/fetch");
  const [sanity, shell] = await Promise.all([
    fetchEmailPrivacyExport().catch(() => null),
    fetchSharedShell(),
  ]);
  const copy = { ...EMAIL_PRIVACY_EXPORT_DEFAULTS, ...pickDefined(sanity ?? {}) };
  const subject = applyTokens(copy.subject, {
    firstName: args.firstName,
    expiryDays: args.expiryDays,
  });
  const html = await render(
    <PrivacyExport
      vars={{
        firstName: args.firstName,
        downloadUrl: args.downloadUrl,
        expiryDays: args.expiryDays,
      }}
      copy={copy}
      shell={shell}
    />,
  );
  return sendOrSkip({
    to: args.to,
    subject,
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

export async function sendReadingOverdueAlert(submission: SubmissionContext): Promise<EmailSendResult> {
  const notificationEmail = requireNotificationEmail("reading_overdue_alert");
  if (typeof notificationEmail !== "string") return notificationEmail;

  const html = await render(
    <ReadingOverdueAlert
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
    subType: "reading_overdue_alert",
    submissionId: submission.id,
    originatorEmail: submission.email,
  });
}
