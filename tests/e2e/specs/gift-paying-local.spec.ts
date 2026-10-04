import { type APIRequestContext, expect, test } from "@playwright/test";

import { giftClientReferenceId } from "@/lib/gift/clientReference";
import { formatGiftCode } from "@/lib/gift/giftCodeFormat";

import {
  type CapturedEmail,
  capturedEmailsTo,
  getCapturedEmails,
  resetCapturedState,
} from "../helpers/captureStore";
import { resetE2EDatabase } from "../helpers/e2eReset";
import { purchaseGift, seedPaidGift } from "../helpers/giftSeed";
import { newStripeSessionId } from "../helpers/stripeStub";
import { fireCheckoutCompleted, fireCheckoutExpired } from "../helpers/stripeWebhook";

const READING_SLUG = "birth-chart";
const BUYER_EMAIL = "gift-buyer@withjosephine.com";
const LATER_BUYER_EMAIL = "gift-later-buyer@withjosephine.com";

async function seedLaterPaidGift(request: APIRequestContext): Promise<void> {
  await seedPaidGift(request, { readingSlug: READING_SLUG, buyerEmail: LATER_BUYER_EMAIL });
}

async function capturedRecipients(request: APIRequestContext): Promise<CapturedEmail["to"][]> {
  return (await getCapturedEmails(request)).map((email) => email.to);
}

test.beforeEach(async ({ request }) => {
  await resetCapturedState(request);
  await resetE2EDatabase(request);
});

test.describe("Gift paying, mock mode", () => {
  test("a paid gift sends one buyer email with the code", async ({ request }) => {
    const gift = await seedPaidGift(request, { readingSlug: READING_SLUG, buyerEmail: BUYER_EMAIL });

    const emails = await capturedEmailsTo(request, BUYER_EMAIL);
    expect(emails).toHaveLength(1);
    expect(emails[0].html).toContain(formatGiftCode(gift.code));
  });

  test("a repeated completed webhook sends no second buyer email", async ({ request }) => {
    const gift = await seedPaidGift(request, { readingSlug: READING_SLUG, buyerEmail: BUYER_EMAIL });

    const repeat = await fireCheckoutCompleted(request, giftClientReferenceId(gift.giftId), {
      stripeSessionId: gift.sessionId,
      customerEmail: BUYER_EMAIL,
    });
    expect(repeat.status()).toBe(200);
    await seedLaterPaidGift(request);

    expect(await capturedRecipients(request)).toEqual([BUYER_EMAIL, LATER_BUYER_EMAIL]);
  });

  test("an unpaid completed webhook sends no buyer email", async ({ request }) => {
    const { giftId } = await purchaseGift(request, READING_SLUG);

    const unpaid = await fireCheckoutCompleted(request, giftClientReferenceId(giftId), {
      stripeSessionId: newStripeSessionId(),
      customerEmail: BUYER_EMAIL,
      paymentStatus: "unpaid",
    });
    expect(unpaid.status()).toBe(200);
    await seedLaterPaidGift(request);

    expect(await capturedRecipients(request)).toEqual([LATER_BUYER_EMAIL]);
  });

  test("an expired checkout on a pending gift sends no buyer email", async ({ request }) => {
    const { giftId } = await purchaseGift(request, READING_SLUG);

    const expired = await fireCheckoutExpired(request, giftClientReferenceId(giftId));
    expect(expired.status()).toBe(200);
    await seedLaterPaidGift(request);

    expect(await capturedRecipients(request)).toEqual([LATER_BUYER_EMAIL]);
  });
});
