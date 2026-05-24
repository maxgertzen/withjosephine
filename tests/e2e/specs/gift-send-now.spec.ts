import { expect, test } from "@playwright/test";

import { signInViaMagicLink } from "../helpers/auth";
import { resetCapturedState } from "../helpers/captureStore";
import { datetimeLocalPlus } from "../helpers/datetimeLocal";
import { resetE2EDatabase } from "../helpers/e2eReset";
import { interceptStripeCheckout } from "../helpers/stripeCheckout";
import { fireCheckoutCompleted } from "../helpers/stripeWebhook";
import { waitForTurnstileToken } from "../helpers/turnstile";

const READING_SLUG = "birth-chart";

test.beforeEach(async ({ request }) => {
  await resetCapturedState(request);
  await resetE2EDatabase(request);
});

test.describe("Send-now — purchaser fires claim email ahead of schedule (D-10) — mock mode", () => {
  test("arms via 5s confirm, posts to /send-now, intercepted payload + 200 round-trip", async ({
    page,
    request,
  }) => {
    test.setTimeout(2 * 60 * 1000);

    const purchaserEmail = "send-now-purchaser@withjosephine.com";

    const intercept = await interceptStripeCheckout(page, {
      readingSlug: READING_SLUG,
      gift: true,
    });

    await page.goto(`/book/${READING_SLUG}/gift`);
    await page.locator(`input[name="deliveryMethod"][value="scheduled"]`).check();
    await page.locator("#gift-purchaser-first-name").fill("SendNowPurchaser");
    await page.locator("#gift-purchaser-email").fill(purchaserEmail);
    await page.locator("#gift-recipient-name").fill("SendNowRecipient");
    await page
      .locator("#gift-recipient-email")
      .fill("send-now-recipient@withjosephine.com");
    const initialSendAt = await datetimeLocalPlus(page, 60 * 24); // ~24h out
    await page.locator("#gift-send-at").fill(initialSendAt);
    await page.locator("#gift-message").fill("D-10 send-now e2e walk.");
    await page.locator("#gift-art6-consent").check();
    await page.locator("#gift-cooling-off-consent").check();
    await waitForTurnstileToken(page);
    await page.getByRole("button", { name: /(send|schedule|gift)/i }).first().click();
    await page.waitForURL(/\/thank-you\//, { timeout: 30_000 });

    const { sessionId, submissionId } = await intercept.captured;

    const webhookResponse = await fireCheckoutCompleted(request, submissionId, {
      stripeSessionId: sessionId,
      customerEmail: purchaserEmail,
      amountTotal: 9900,
    });
    expect(webhookResponse.status()).toBe(200);

    await signInViaMagicLink(page, { email: purchaserEmail, next: "/my-gifts" });

    const sendNowCta = page.getByRole("button", { name: /^send now$/i });
    await expect(sendNowCta).toBeVisible();
    await sendNowCta.click();
    const confirmCta = page.getByRole("button", { name: /tap again to send today/i });
    await expect(confirmCta).toBeVisible();

    let captured: { url: string; method: string } | null = null;
    await page.route(`**/api/gifts/${submissionId}/send-now`, async (route) => {
      captured = { url: route.request().url(), method: route.request().method() };
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ updated: true }),
      });
    });

    await confirmCta.click();
    await expect.poll(() => captured !== null, { timeout: 5_000 }).toBe(true);

    expect(captured!.method).toBe("POST");
    expect(new URL(captured!.url).pathname).toBe(
      `/api/gifts/${submissionId}/send-now`,
    );
  });
});
