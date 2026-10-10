import "server-only";

import * as Sentry from "@sentry/cloudflare";
import type Stripe from "stripe";

import { serverTrack } from "@/lib/analytics/server";
import { AUDIT_EVENT_TYPE } from "@/lib/audit/eventTypes";
import { isFirstReport } from "@/lib/audit/reportOnce";
import { normalizeEmail } from "@/lib/auth/users";
import { buildFinancialMirror } from "@/lib/booking/financialMirror";
import { applyTokens } from "@/lib/emails/applyTokens";
import { siteOrigin } from "@/lib/env";
import { resolveReadingName } from "@/lib/readingSummary";
import { sendGiftPurchase } from "@/lib/resend";
import {
  isPaidByAnotherSession,
  paidFieldsFromSession,
  type PaidSessionFields,
} from "@/lib/stripeSession";

import { giftClientReferenceId, giftIdFromClientReferenceId } from "./clientReference";
import { giftPaymentEventFields } from "./giftAnalytics";
import { deriveGiftSendToken, deriveVerifiedGiftCode, giftUrl } from "./giftCode";
import { formatGiftCode, giftSendPath } from "./giftCodeFormat";
import { giftContent } from "./giftContent";
import { recordUnsentGiftEmail } from "./giftEmailFailures";
import {
  appendGiftEmailFired,
  claimGiftBuyerEmail,
  findGiftById,
  markGiftActive,
  releaseGiftBuyerEmailClaim,
} from "./gifts";
import { GIFT_STATUS, type GiftRecord, type GiftStatus } from "./types";

const WHATSAPP_SHARE_URL = "https://wa.me/?text=";
const EMOJI_WHATSAPP_WEB_BREAKS = new RegExp(
  "\\p{RGI_Emoji}|[[\\p{Extended_Pictographic}\\p{Emoji_Modifier}\\p{Regional_Indicator}]--[©®™]]",
  "gv",
);

export function whatsappShareUrl(message: string, url: string): string {
  const textWhatsAppWebCanShow = message
    .replace(EMOJI_WHATSAPP_WEB_BREAKS, "")
    .replace(/\s+/g, " ")
    .trim();
  return WHATSAPP_SHARE_URL + encodeURIComponent([textWhatsAppWebCanShow, url].filter(Boolean).join(" "));
}

export type GiftActivationInput = PaidSessionFields & {
  giftId: string;
  paymentStatus: Stripe.Checkout.Session["payment_status"];
  buyerEmail: string | null;
};

export type ActivateGiftResult =
  | "not_paid"
  | "not_found"
  | "no_buyer_email"
  | "cancelled_before_payment"
  | "duplicate"
  | "done";

export type ActivateGiftOutcome = { result: ActivateGiftResult; gift: GiftRecord | null };

export function giftActivationFromSession(
  session: Stripe.Checkout.Session,
  paidAt: string,
): GiftActivationInput | null {
  const giftId = giftIdFromClientReferenceId(session.client_reference_id ?? "");
  if (!giftId) return null;
  return {
    ...paidFieldsFromSession(session, paidAt),
    giftId,
    paymentStatus: session.payment_status,
    buyerEmail: session.customer_details?.email ?? null,
  };
}

export async function sendBuyerConfirmation(
  gift: GiftRecord,
  code: string,
  buyerEmail: string,
  idempotencyKey: string,
): ReturnType<typeof sendGiftPurchase> {
  const { fetchEmailGiftSettings, fetchReadingPublished } = await import("@/lib/sanity/fetch");
  const [settings, name, sendToken] = await Promise.all([
    fetchEmailGiftSettings().catch(() => null),
    resolveReadingName(gift.readingSlug, fetchReadingPublished),
    deriveGiftSendToken(gift.id),
  ]);
  const url = giftUrl(code);
  const shareMessage = applyTokens(giftContent(settings).shareMessageTemplate, {
    buyerName: gift.buyerFirstName,
  });
  return sendGiftPurchase(
    {
      to: buyerEmail,
      firstName: gift.buyerFirstName,
      readingName: name,
      hasNote: gift.note !== null,
      displayCode: formatGiftCode(code),
      giftUrl: url,
      whatsappUrl: whatsappShareUrl(shareMessage, url),
      sendUrl: siteOrigin() + giftSendPath(sendToken),
    },
    { giftId: gift.id, idempotencyKey },
  );
}

async function confirmToBuyer(
  claimed: GiftRecord,
  input: GiftActivationInput,
  claimedAt: string,
): Promise<void> {
  const code = await deriveVerifiedGiftCode(claimed);
  const { buyerEmail } = claimed;
  if (!code || !buyerEmail) {
    await releaseGiftBuyerEmailClaim(claimed.id, claimedAt);
    return;
  }

  const attemptedAt = new Date().toISOString();
  const result = await sendBuyerConfirmation(
    claimed,
    code,
    buyerEmail,
    `gift-confirmation/${claimed.id}`,
  ).catch(async (error: unknown) => {
    await recordUnsentGiftEmail(claimed.id, "gift_confirmation", attemptedAt, error);
    throw error;
  });
  if (result.kind === "failed") {
    console.error(`[activateGift] buyer confirmation failed for gift ${claimed.id}`);
    await Promise.all([
      releaseGiftBuyerEmailClaim(claimed.id, claimedAt),
      recordUnsentGiftEmail(claimed.id, "gift_confirmation", attemptedAt, result),
    ]);
    return;
  }
  if (result.kind === "skipped") {
    await recordUnsentGiftEmail(claimed.id, "gift_confirmation", attemptedAt, result);
  }

  void serverTrack("payment_success", {
    ...giftPaymentEventFields(claimed.id),
    reading_id: claimed.readingSlug,
    amount_paid_cents: input.amountPaidCents,
    currency: input.amountPaidCurrency,
  });
  if (result.kind !== "sent") return;
  try {
    await appendGiftEmailFired(claimed.id, {
      type: "gift_confirmation",
      sentAt: new Date().toISOString(),
      resendId: result.resendId,
    });
  } catch {
    console.error(`[activateGift] emailsFired write failed for gift ${claimed.id}`);
  }
}

const PAID_GIFT_STATUSES: ReadonlySet<GiftStatus> = new Set([
  GIFT_STATUS.active,
  GIFT_STATUS.redeemed,
  GIFT_STATUS.cancelled,
]);

function isSecondPayment(gift: GiftRecord | null, stripeSessionId: string): boolean {
  if (!gift || !PAID_GIFT_STATUSES.has(gift.status)) return false;
  return isPaidByAnotherSession(gift.stripeSessionId, stripeSessionId);
}

async function reportPaymentForUnpaidCancelledGift(
  giftId: string,
  stripeSessionId: string,
): Promise<void> {
  const first = await isFirstReport(`cancelled-gift-paid/${stripeSessionId}`, {
    eventType: AUDIT_EVENT_TYPE.cancelled_gift_paid,
    userId: null,
    submissionId: giftClientReferenceId(giftId),
    success: false,
  });
  if (!first) return;
  console.warn(`[activateGift] gift ${giftId} was cancelled before payment, refund it by hand`);
  Sentry.captureMessage("Paid Checkout session for a gift cancelled before payment", {
    level: "warning",
    extra: { giftId, stripeSessionId },
  });
}

async function activateOrFindPaidElsewhere(
  input: GiftActivationInput,
  buyerEmail: string,
): Promise<GiftRecord | null> {
  const { giftId, stripeSessionId } = input;
  const financial = buildFinancialMirror(
    {
      submissionId: giftClientReferenceId(giftId),
      userId: null,
      email: normalizeEmail(buyerEmail),
    },
    input,
  );
  const activated = await markGiftActive(
    giftId,
    { buyerEmail, stripeSessionId, activatedAt: input.paidAt },
    financial,
  );
  if (activated) return null;
  const current = await findGiftById(giftId);
  return isSecondPayment(current, stripeSessionId) ? current : null;
}

export async function activateGift(input: GiftActivationInput): Promise<ActivateGiftOutcome> {
  const { giftId, buyerEmail, stripeSessionId } = input;
  if (input.paymentStatus !== "paid") return { result: "not_paid", gift: null };

  const gift = await findGiftById(giftId);
  if (!gift) return { result: "not_found", gift: null };
  if (isSecondPayment(gift, stripeSessionId)) return { result: "duplicate", gift };
  if (gift.status === GIFT_STATUS.cancelled && !gift.stripeSessionId) {
    await reportPaymentForUnpaidCancelledGift(giftId, stripeSessionId);
    return { result: "cancelled_before_payment", gift };
  }
  if (!buyerEmail) {
    console.error(`[activateGift] paid session for gift ${giftId} has no buyer email`);
    return { result: "no_buyer_email", gift: null };
  }

  const awaitingPayment = gift.status === "pending" || gift.status === "expired";
  const paidElsewhere = awaitingPayment
    ? await activateOrFindPaidElsewhere(input, buyerEmail)
    : null;
  if (paidElsewhere) return { result: "duplicate", gift: paidElsewhere };

  const claimedAt = new Date().toISOString();
  const claimed = await claimGiftBuyerEmail(giftId, claimedAt);
  if (!claimed) {
    return { result: "done", gift: awaitingPayment ? await findGiftById(giftId) : gift };
  }

  try {
    await confirmToBuyer(claimed, input, claimedAt);
  } catch (error) {
    await releaseGiftBuyerEmailClaim(giftId, claimedAt);
    throw error;
  }
  return { result: "done", gift: claimed };
}
