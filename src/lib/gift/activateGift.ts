import "server-only";

import * as Sentry from "@sentry/cloudflare";
import type Stripe from "stripe";

import { serverTrack } from "@/lib/analytics/server";
import { normalizeEmail } from "@/lib/auth/users";
import { buildFinancialMirror } from "@/lib/booking/financialMirror";
import { applyTokens } from "@/lib/emails/applyTokens";
import { siteOrigin } from "@/lib/env";
import { resolveReadingSummary } from "@/lib/readingSummary";
import { sendGiftPurchase } from "@/lib/resend";
import { paidFieldsFromSession, type PaidSessionFields } from "@/lib/stripeSession";

import { giftClientReferenceId, giftIdFromClientReferenceId } from "./clientReference";
import { giftPaymentEventFields } from "./giftAnalytics";
import { deriveGiftSendToken, deriveVerifiedGiftCode } from "./giftCode";
import { formatGiftCode, giftPath, giftSendPath } from "./giftCodeFormat";
import { giftContent } from "./giftContent";
import {
  appendGiftEmailFired,
  claimGiftBuyerEmail,
  findGiftById,
  markGiftActive,
  releaseGiftBuyerEmailClaim,
} from "./gifts";
import type { GiftRecord } from "./types";

const WHATSAPP_SHARE_URL = "https://wa.me/?text=";

export type GiftActivationInput = PaidSessionFields & {
  giftId: string;
  paymentStatus: Stripe.Checkout.Session["payment_status"];
  buyerEmail: string | null;
};

export type ActivateGiftResult = "not_paid" | "not_found" | "no_buyer_email" | "done";

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

async function readingName(readingSlug: string): Promise<string> {
  const { fetchReadingPublished } = await import("@/lib/sanity/fetch");
  const reading = await resolveReadingSummary(readingSlug, (slug) =>
    fetchReadingPublished(slug).catch(() => null),
  );
  return reading?.name ?? readingSlug;
}

async function sendBuyerConfirmation(
  gift: GiftRecord,
  code: string,
  buyerEmail: string,
): ReturnType<typeof sendGiftPurchase> {
  const { fetchEmailGiftSettings } = await import("@/lib/sanity/fetch");
  const [settings, name, sendToken] = await Promise.all([
    fetchEmailGiftSettings().catch(() => null),
    readingName(gift.readingSlug),
    deriveGiftSendToken(gift.id),
  ]);
  const giftUrl = siteOrigin() + giftPath(code);
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
      giftUrl,
      whatsappUrl: WHATSAPP_SHARE_URL + encodeURIComponent(`${shareMessage} ${giftUrl}`),
      sendUrl: siteOrigin() + giftSendPath(sendToken),
    },
    { giftId: gift.id, idempotencyKey: `gift-confirmation/${gift.id}` },
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

  const result = await sendBuyerConfirmation(claimed, code, buyerEmail);
  if (result.kind === "failed") {
    console.error(`[activateGift] buyer confirmation failed for gift ${claimed.id}`);
    await releaseGiftBuyerEmailClaim(claimed.id, claimedAt);
    return;
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

function reportSecondPayment(gift: GiftRecord | null, stripeSessionId: string): void {
  if (gift?.status !== "active" || gift.stripeSessionId === stripeSessionId) return;
  console.warn(`[activateGift] gift ${gift.id} already paid by another session, ignoring this one`);
  Sentry.captureMessage("Gift paid by a second Checkout session", {
    level: "warning",
    extra: { giftId: gift.id },
  });
}

export async function activateGift(input: GiftActivationInput): Promise<ActivateGiftOutcome> {
  const { giftId, buyerEmail } = input;
  if (input.paymentStatus !== "paid") return { result: "not_paid", gift: null };
  if (!buyerEmail) {
    console.error(`[activateGift] paid session for gift ${giftId} has no buyer email`);
    return { result: "no_buyer_email", gift: null };
  }

  const gift = await findGiftById(giftId);
  if (!gift) {
    console.warn(`[activateGift] gift ${giftId} not found, manual reconcile will retry`);
    return { result: "not_found", gift: null };
  }

  const awaitingPayment = gift.status === "pending" || gift.status === "expired";
  if (awaitingPayment) {
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
      { buyerEmail, stripeSessionId: input.stripeSessionId, activatedAt: input.paidAt },
      financial,
    );
    if (!activated) reportSecondPayment(await findGiftById(giftId), input.stripeSessionId);
  } else {
    reportSecondPayment(gift, input.stripeSessionId);
  }

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
