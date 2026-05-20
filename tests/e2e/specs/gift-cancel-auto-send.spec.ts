import { expect, test } from "@playwright/test";

import { signInViaMagicLink } from "../helpers/auth";
import { resetCapturedState } from "../helpers/captureStore";
import { datetimeLocalPlus } from "../helpers/datetimeLocal";
import { interceptStripeCheckout } from "../helpers/stripeCheckout";
import { waitForTurnstileToken } from "../helpers/turnstile";

const READING_SLUG = "birth-chart";

test.beforeEach(async ({ request }) => {
  await resetCapturedState(request);
  await request.post("/api/e2e-reset").catch(() => undefined);
});

test.describe("Cancel-auto-send — purchaser flips a scheduled gift to self-send — mock mode", () => {
  test("arms via confirm CTA, posts to /cancel-auto-send, intercepted payload + 200 round-trip", async ({
    page,
  }) => {
    test.setTimeout(2 * 60 * 1000);

    const purchaserEmail = "cancel-auto-send-purchaser@withjosephine.com";

    const intercept = await interceptStripeCheckout(page, {
      readingSlug: READING_SLUG,
      gift: true,
    });

    await page.goto(`/book/${READING_SLUG}/gift`);
    await page.locator(`input[name="deliveryMethod"][value="scheduled"]`).check();
    await page.locator("#gift-purchaser-first-name").fill("FlipPurchaser");
    await page.locator("#gift-purchaser-email").fill(purchaserEmail);
    await page.locator("#gift-recipient-name").fill("FlipRecipient");
    await page
      .locator("#gift-recipient-email")
      .fill("cancel-auto-send-recipient@withjosephine.com");
    const initialSendAt = await datetimeLocalPlus(page, 60 * 24);
    await page.locator("#gift-send-at").fill(initialSendAt);
    await page.locator("#gift-message").fill("Flip-to-self-send e2e walk.");
    await page.locator("#gift-art6-consent").check();
    await page.locator("#gift-cooling-off-consent").check();
    await waitForTurnstileToken(page);
    await page.getByRole("button", { name: /(send|schedule|gift)/i }).first().click();
    await page.waitForURL(/\/thank-you\//, { timeout: 30_000 });

    const { submissionId } = await intercept.captured;

    await signInViaMagicLink(page, { email: purchaserEmail, next: "/my-gifts" });

    const flipCta = page.getByRole("button", { name: /send the link myself instead/i });
    await expect(flipCta).toBeVisible();
    await flipCta.click();

    const confirmCta = page.getByRole("button", { name: /tap again to confirm/i });
    await expect(confirmCta).toBeVisible();

    let captured: { url: string; method: string } | null = null;
    await page.route(
      `**/api/gifts/${submissionId}/cancel-auto-send`,
      async (route) => {
        captured = { url: route.request().url(), method: route.request().method() };
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            updated: true,
            claimUrl: `http://localhost:3000/gift/claim/dummy-token-${submissionId.slice(0, 8)}`,
          }),
        });
      },
    );

    await confirmCta.click();
    await expect.poll(() => captured !== null, { timeout: 5_000 }).toBe(true);

    expect(captured!.method).toBe("POST");
    expect(new URL(captured!.url).pathname).toBe(
      `/api/gifts/${submissionId}/cancel-auto-send`,
    );
  });
});
