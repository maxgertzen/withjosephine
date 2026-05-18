import { expect, test } from "@playwright/test";

import { resetCapturedState } from "../helpers/captureStore";
import { datetimeLocalPlus } from "../helpers/datetimeLocal";
import { setGiftClaimCookieForTest } from "../helpers/giftClaimCookie";
import { waitForTurnstileToken } from "../helpers/turnstile";

const READING_SLUG = "birth-chart";

test.beforeEach(async ({ request }) => {
  await resetCapturedState(request);
  await request.post("/api/e2e-reset").catch(() => undefined);
});

test.describe("Gift redeem CTA + disclaimer — mock mode (B-10)", () => {
  test("redeem intake shows 'Send my answers' instead of 'Continue to payment'", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    let interceptedSubmissionId: string | null = null;
    await page.route("https://buy.stripe.com/**", async (route) => {
      const url = new URL(route.request().url());
      interceptedSubmissionId = url.searchParams.get("client_reference_id");
      await route.fulfill({
        status: 303,
        headers: { location: `/thank-you/${READING_SLUG}?gift=1` },
      });
    });

    await page.goto(`/book/${READING_SLUG}/gift`);
    await page.locator(`input[name="deliveryMethod"][value="scheduled"]`).check();
    await page.locator("#gift-purchaser-first-name").fill("RedeemTestPurchaser");
    await page.locator("#gift-purchaser-email").fill("redeem-purchaser@withjosephine.com");
    await page.locator("#gift-recipient-name").fill("RedeemRecipient");
    await page
      .locator("#gift-recipient-email")
      .fill("redeem-recipient@withjosephine.com");
    const sendAt = await datetimeLocalPlus(page, 60);
    await page.locator("#gift-send-at").fill(sendAt);
    await page.locator("#gift-message").fill("Redeem CTA test.");
    await page.locator("#gift-art6-consent").check();
    await page.locator("#gift-cooling-off-consent").check();
    await waitForTurnstileToken(page);
    await page.getByRole("button", { name: /(send|schedule|gift)/i }).first().click();

    await page.waitForURL(/\/thank-you\//, { timeout: 30_000 });
    expect(interceptedSubmissionId).not.toBeNull();

    await setGiftClaimCookieForTest(page.context().request, interceptedSubmissionId!);

    await page.goto("/gift/intake");
    await expect(page).toHaveURL(/\/gift\/intake/, { timeout: 15_000 });
    const submit = page.getByTestId("intake-submit");
    await expect(submit).toBeVisible({ timeout: 15_000 });
    await expect(submit).toContainText(/send my answers/i);
    await expect(page.getByRole("button", { name: /continue to payment/i })).toHaveCount(0);
    await expect(page.getByText(/once i receive your intake form/i)).toHaveCount(0);
  });
});
