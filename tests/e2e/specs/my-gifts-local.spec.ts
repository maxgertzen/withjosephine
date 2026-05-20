import { expect, test } from "@playwright/test";

import { signInViaMagicLink } from "../helpers/auth";
import { resetCapturedState } from "../helpers/captureStore";
import { datetimeLocalPlus } from "../helpers/datetimeLocal";
import { resetE2EDatabase } from "../helpers/e2eReset";
import { interceptStripeCheckout } from "../helpers/stripeCheckout";
import { waitForTurnstileToken } from "../helpers/turnstile";

const READING_SLUG = "birth-chart";

test.beforeEach(async ({ request }) => {
  await resetCapturedState(request);
  await resetE2EDatabase(request);
});

test.describe("/my-gifts surfaces purchased gifts (B-11) — mock mode", () => {
  test("purchaser sees their gift on /my-gifts after authenticating", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const purchaserEmail = "mygifts-purchaser@withjosephine.com";
    const recipientName = "MyGiftsRecipient";

    await interceptStripeCheckout(page, { readingSlug: READING_SLUG, gift: true });

    await page.goto(`/book/${READING_SLUG}/gift`);
    await page.locator(`input[name="deliveryMethod"][value="scheduled"]`).check();
    await page.locator("#gift-purchaser-first-name").fill("MyGiftsPurchaser");
    await page.locator("#gift-purchaser-email").fill(purchaserEmail);
    await page.locator("#gift-recipient-name").fill(recipientName);
    await page
      .locator("#gift-recipient-email")
      .fill("mygifts-recipient@withjosephine.com");
    const sendAt = await datetimeLocalPlus(page, 60);
    await page.locator("#gift-send-at").fill(sendAt);
    await page.locator("#gift-message").fill("My-gifts test.");
    await page.locator("#gift-art6-consent").check();
    await page.locator("#gift-cooling-off-consent").check();
    await waitForTurnstileToken(page);
    await page.getByRole("button", { name: /(send|schedule|gift)/i }).first().click();
    await page.waitForURL(/\/thank-you\//, { timeout: 30_000 });

    await signInViaMagicLink(page, { email: purchaserEmail, next: "/my-gifts" });

    await expect(page.getByText(recipientName)).toBeVisible();
  });
});
