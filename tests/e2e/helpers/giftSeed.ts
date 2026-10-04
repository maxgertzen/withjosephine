import { type APIRequestContext, expect } from "@playwright/test";

import { giftClientReferenceId, giftIdFromClientReferenceId } from "@/lib/gift/clientReference";
import {
  GIFT_CODE_ALPHABET,
  GIFT_CODE_LENGTH,
  giftPath,
  giftSendPath,
} from "@/lib/gift/giftCodeFormat";
import { GIFT_PURCHASE_API_ROUTE } from "@/lib/http/routes";

import { waitForEmailTo } from "./captureStore";
import { newStripeSessionId, registerStripeSession } from "./stripeStub";
import { fireCheckoutCompleted } from "./stripeWebhook";

const GIFT_AMOUNT_CENTS = 9900;
const GIFT_CURRENCY = "usd";
const GIFT_LINK_CODE = new RegExp(`/gift/([${GIFT_CODE_ALPHABET}]{${GIFT_CODE_LENGTH}})(?![0-9A-Z])`);
const GIFT_SEND_LINK_TOKEN = /\/gift\/send#([\w.-]+)/;

export type PurchasedGift = {
  giftId: string;
};

export type SeededGift = {
  giftId: string;
  code: string;
  giftUrl: string;
  sendUrl: string;
  sessionId: string;
};

export async function purchaseGift(
  request: APIRequestContext,
  readingSlug: string,
): Promise<PurchasedGift> {
  const response = await request.post(GIFT_PURCHASE_API_ROUTE, {
    data: {
      readingSlug,
      buyerFirstName: "Ada",
      note: "",
      coolingOffConsent: true,
      turnstileToken: "bypass",
    },
  });
  expect(response.status(), await response.text()).toBe(200);
  const { giftId, paymentUrl } = (await response.json()) as { giftId: string; paymentUrl: string };
  const clientReferenceId = new URL(paymentUrl).searchParams.get("client_reference_id") ?? "";
  expect(giftIdFromClientReferenceId(clientReferenceId)).toBe(giftId);
  return { giftId };
}

export async function seedPaidGift(
  request: APIRequestContext,
  { readingSlug, buyerEmail }: { readingSlug: string; buyerEmail: string },
): Promise<SeededGift> {
  const { giftId } = await purchaseGift(request, readingSlug);
  const clientReferenceId = giftClientReferenceId(giftId);
  const sessionId = newStripeSessionId();
  await registerStripeSession(request, {
    id: sessionId,
    client_reference_id: clientReferenceId,
    payment_status: "paid",
    amount_total: GIFT_AMOUNT_CENTS,
    currency: GIFT_CURRENCY,
    customer_email: buyerEmail,
  });

  const webhook = await fireCheckoutCompleted(request, clientReferenceId, {
    stripeSessionId: sessionId,
    customerEmail: buyerEmail,
    amountTotal: GIFT_AMOUNT_CENTS,
    currency: GIFT_CURRENCY,
  });
  expect(webhook.status()).toBe(200);

  const { html = "" } = await waitForEmailTo(request, buyerEmail);
  const code = html.match(GIFT_LINK_CODE)?.[1];
  const sendToken = html.match(GIFT_SEND_LINK_TOKEN)?.[1];
  if (!code || !sendToken) {
    throw new Error("[e2e/giftSeed] buyer email has no gift link or send link");
  }

  return {
    giftId,
    code,
    giftUrl: giftPath(code),
    sendUrl: giftSendPath(sendToken),
    sessionId,
  };
}
