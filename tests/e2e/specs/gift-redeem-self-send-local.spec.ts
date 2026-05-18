import { expect, test } from "@playwright/test";

import { resetCapturedState } from "../helpers/captureStore";
import { setGiftClaimCookieForTest } from "../helpers/giftClaimCookie";
import {
  clickThroughIntakePages,
  seedIntakeDraft,
} from "../helpers/intakeDraft";
import { waitForTurnstileToken } from "../helpers/turnstile";

// C-4b — self_send purchases leave recipient_email NULL at purchase time.
// The recipient supplies it at claim. Pre-fix `/api/booking/gift-redeem`
// returned 422 "Recipient email missing" before the email-mismatch check
// could even run, killing the whole flow. This spec walks the full path
// — purchase → claim → intake → submit — and asserts the redeem POST
// succeeds (no 422), regression-guarding C-4b.

const READING_SLUG = "birth-chart";

test.beforeEach(async ({ request }) => {
  await resetCapturedState(request);
  await request.post("/api/e2e-reset").catch(() => undefined);
});

test.describe("Gift redeem — self_send recipient submit (C-4b)", () => {
  test("self_send recipient can submit intake without recipient_email at purchase", async ({
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
      .locator(`input[name="deliveryMethod"][value="self_send"]`)
      .check();
    await page.locator("#gift-purchaser-first-name").fill("SelfSendPurchaser");
    await page
      .locator("#gift-purchaser-email")
      .fill("self-send-purchaser@withjosephine.com");
    await page.locator("#gift-recipient-name").fill("SelfSendRecipient");
    await page.locator("#gift-message").fill("Self-send redeem regression guard.");
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

    // Hold the redeem POST so the submit overlay is observable. Asserts
    // C-4a (overlay copy is the recipient-specific string, not the booking
    // flow's "taking you to checkout") in the same test as C-4b.
    let releaseRedeemResponse: () => void = () => {};
    const redeemDelayPromise = new Promise<void>((resolve) => {
      releaseRedeemResponse = resolve;
    });
    await page.route("**/api/booking/gift-redeem", async (route) => {
      await redeemDelayPromise;
      await route.continue();
    });

    const redeemResponsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/booking/gift-redeem") &&
        resp.request().method() === "POST",
      { timeout: 30_000 },
    );

    await page.goto("/gift/intake");
    await expect(page).toHaveURL(/\/gift\/intake/, { timeout: 15_000 });

    await clickThroughIntakePages(page, 6);

    await page.locator("#field-art6-consent").check();
    await page.locator("#field-art9-consent").check();
    const coolingOff = page.locator("#field-cooling-off-consent");
    if ((await coolingOff.count()) > 0) {
      await coolingOff.check();
    }

    await page.getByTestId("intake-submit").click();

    await expect(page.getByText(/sending your answers/i)).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText(/taking you to checkout/i)).toHaveCount(0);

    releaseRedeemResponse();

    const redeemResponse = await redeemResponsePromise;
    expect(
      redeemResponse.status(),
      "self_send redeem must not 422 on missing recipient_email",
    ).not.toBe(422);
    expect(redeemResponse.status()).toBeLessThan(400);

    await expect(page).toHaveURL(/\/thank-you\/.*gift=1.*redeemed=1/, {
      timeout: 10_000,
    });

    await expect(page.getByText(/\{deliveryDays\}/)).toHaveCount(0);
    await expect(page.getByText(/seven days/i).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/\$\d/)).toHaveCount(0);
  });
});
