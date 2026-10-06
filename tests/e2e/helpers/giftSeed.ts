import { type APIRequestContext, expect } from "@playwright/test";

import { HONEYPOT_FIELD } from "@/lib/booking/constants";
import { giftClientReferenceId, giftIdFromClientReferenceId } from "@/lib/gift/clientReference";
import {
  GIFT_CODE_ALPHABET,
  GIFT_CODE_LENGTH,
  giftPath,
  giftSendPath,
} from "@/lib/gift/giftCodeFormat";
import { GIFT_PURCHASE_API_ROUTE } from "@/lib/http/routes";

import { waitForEmailTo } from "./captureStore";
import { newStripeSessionId, registerStripeSession, type StubCheckoutSession } from "./stripeStub";
import { fireCheckoutCompleted } from "./stripeWebhook";

export const SEEDED_BUYER_FIRST_NAME = "Ada";

const GIFT_AMOUNT_CENTS = 9900;
const GIFT_CURRENCY = "usd";
const GIFT_LINK_CODE = new RegExp(`/gift/([${GIFT_CODE_ALPHABET}]{${GIFT_CODE_LENGTH}})(?![0-9A-Z])`);
const GIFT_SEND_LINK_TOKEN = /\/gift\/send#([\w.-]+)/;
const DISPLAY_CODE_GROUP = `[${GIFT_CODE_ALPHABET}]{4}`;
export const GIFT_DISPLAY_CODE = new RegExp(
  `${DISPLAY_CODE_GROUP}-${DISPLAY_CODE_GROUP}-${DISPLAY_CODE_GROUP}`,
);

export type PurchasedGift = {
  giftId: string;
  paymentUrl: string;
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
  { note = "", turnstileToken = "bypass" }: { note?: string; turnstileToken?: string } = {},
): Promise<PurchasedGift> {
  const response = await request.post(GIFT_PURCHASE_API_ROUTE, {
    data: {
      readingSlug,
      buyerFirstName: SEEDED_BUYER_FIRST_NAME,
      note,
      coolingOffConsent: true,
      turnstileToken,
      [HONEYPOT_FIELD]: "",
    },
  });
  expect(response.status(), await response.text()).toBe(200);
  const { giftId, paymentUrl } = (await response.json()) as PurchasedGift;
  const clientReferenceId = new URL(paymentUrl).searchParams.get("client_reference_id") ?? "";
  expect(giftIdFromClientReferenceId(clientReferenceId)).toBe(giftId);
  return { giftId, paymentUrl };
}

export async function registerGiftSession(
  request: APIRequestContext,
  giftId: string,
  {
    paymentStatus,
    buyerEmail,
  }: { paymentStatus: StubCheckoutSession["payment_status"]; buyerEmail: string },
): Promise<string> {
  const sessionId = newStripeSessionId();
  await registerStripeSession(request, {
    id: sessionId,
    client_reference_id: giftClientReferenceId(giftId),
    payment_status: paymentStatus,
    amount_total: GIFT_AMOUNT_CENTS,
    currency: GIFT_CURRENCY,
    customer_email: buyerEmail,
  });
  return sessionId;
}

export async function seedPaidGift(
  request: APIRequestContext,
  { readingSlug, buyerEmail, note }: { readingSlug: string; buyerEmail: string; note?: string },
): Promise<SeededGift> {
  const { giftId } = await purchaseGift(request, readingSlug, { note });
  const sessionId = await registerGiftSession(request, giftId, { paymentStatus: "paid", buyerEmail });

  const webhook = await fireCheckoutCompleted(request, giftClientReferenceId(giftId), {
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
