import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { SANDBOX_DOMAIN, SANDBOX_EMAIL_PREFIXES } from "@/lib/booking/sandboxEmails";

import { GIFT_DISPLAY_CODE, purchaseGift } from "../helpers/giftSeed";
import { cleanupSandboxResidue } from "../helpers/sandboxResidueCleanup";
import { queryStagingD1, sandboxRequestHeaders } from "../helpers/stagingApi";
import { fillStripeCheckout } from "../helpers/stripeCheckout";

const READING_SLUG = "birth-chart";
const DUMMY_TURNSTILE_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";

type GiftRow = { status: string; buyer_email_claimed_at: string | null };

test.use({ extraHTTPHeaders: sandboxRequestHeaders() });

test.describe("Gift sandbox round-trip, staging", () => {
  test.beforeAll(async () => {
    const { sanityDeleted } = await cleanupSandboxResidue({
      emailPrefix: SANDBOX_EMAIL_PREFIXES.giftRoundtrip,
    });
    console.log(
      `[gift-roundtrip] preflight wipe: D1 cleared + ${sanityDeleted} Sanity submission(s) deleted`,
    );
  });

  test("birth-chart: purchase route → Stripe → thank-you shows the code", async ({ page, request }) => {
    test.setTimeout(4 * 60 * 1000);

    const runId = randomUUID().slice(0, 8);
    const buyerEmail = `${SANDBOX_EMAIL_PREFIXES.giftRoundtrip}${runId}${SANDBOX_DOMAIN}`;

    const { paymentUrl, giftId } = await purchaseGift(request, READING_SLUG, {
      turnstileToken: DUMMY_TURNSTILE_TOKEN,
    });

    const thankYouDocument = page.waitForResponse(
      (response) =>
        response.url().includes("/thank-you/") && response.request().resourceType() === "document",
      { timeout: 90_000 },
    );
    await page.goto(paymentUrl);
    await fillStripeCheckout(page, buyerEmail);

    const firstPaint = await (await thankYouDocument).text();
    expect(firstPaint).toMatch(GIFT_DISPLAY_CODE);
    await expect(page.getByText(GIFT_DISPLAY_CODE)).toBeVisible();

    await expect
      .poll(
        async () =>
          (
            await queryStagingD1<GiftRow>(
              `SELECT status, buyer_email_claimed_at FROM gift_codes WHERE id = '${giftId}'`,
            )
          )[0],
        { timeout: 60_000, intervals: [2_000, 5_000] },
      )
      .toMatchObject({ status: "active", buyer_email_claimed_at: expect.any(String) });
  });
});
