import { expect, test } from "@playwright/test";

import { resetCapturedState } from "../helpers/captureStore";
import { datetimeLocalPlus } from "../helpers/datetimeLocal";
import { setGiftClaimCookieForTest } from "../helpers/giftClaimCookie";
import {
  clickThroughIntakePages,
  seedIntakeDraft,
} from "../helpers/intakeDraft";
import { waitForTurnstileToken } from "../helpers/turnstile";

// C-2 — gift recipients didn't pay (the purchaser already waived cooling-off
// at purchase) so the cooling-off checkbox MUST NOT render on /gift/intake.
// Art. 6 + Art. 9 acknowledgments still gate redeem submission.

const READING_SLUG = "birth-chart";

test.beforeEach(async ({ request }) => {
  await resetCapturedState(request);
  await request.post("/api/e2e-reset").catch(() => undefined);
});

test.describe("Gift recipient consent shape (C-2)", () => {
  test("/gift/intake renders art6 + art9 only — cooling-off checkbox absent", async ({
    page,
  }) => {
    test.setTimeout(2 * 60 * 1000);

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
    await page
      .locator(`input[name="deliveryMethod"][value="scheduled"]`)
      .check();
    await page.locator("#gift-purchaser-first-name").fill("ConsentShapeTest");
    await page
      .locator("#gift-purchaser-email")
      .fill("consent-shape@withjosephine.com");
    await page.locator("#gift-recipient-name").fill("ConsentRecipient");
    await page
      .locator("#gift-recipient-email")
      .fill("consent-recipient@withjosephine.com");
    await page.locator("#gift-message").fill("Consent shape regression guard.");
    const sendAt = await datetimeLocalPlus(page, 60);
    await page.locator("#gift-send-at").fill(sendAt);
    await page.locator("#gift-art6-consent").check();
    await page.locator("#gift-cooling-off-consent").check();
    await waitForTurnstileToken(page);
    await page.getByRole("button", { name: /(send|schedule|gift)/i }).first().click();

    await page.waitForURL(/\/thank-you\//, { timeout: 30_000 });
    expect(interceptedSubmissionId).not.toBeNull();

    await setGiftClaimCookieForTest(
      page.context().request,
      interceptedSubmissionId!,
    );

    await seedIntakeDraft(page, `gift-redeem.${interceptedSubmissionId!}`);
    await page.goto("/gift/intake");
    await expect(page).toHaveURL(/\/gift\/intake/, { timeout: 15_000 });

    await clickThroughIntakePages(page, 6);

    await expect(page.locator("#field-art6-consent")).toBeVisible();
    await expect(page.locator("#field-art9-consent")).toBeVisible();
    await expect(page.locator("#field-cooling-off-consent")).toHaveCount(0);
  });
});
