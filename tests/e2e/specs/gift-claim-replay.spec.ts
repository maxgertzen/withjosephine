import { expect, test } from "@playwright/test";

import { getCapturedEmails, resetCapturedState } from "../helpers/captureStore";
import { resetE2EDatabase } from "../helpers/e2eReset";
import {
  clickThroughIntakePages,
  seedIntakeDraft,
} from "../helpers/intakeDraft";
import { interceptStripeCheckout } from "../helpers/stripeCheckout";
import { fireCheckoutCompleted } from "../helpers/stripeWebhook";
import { waitForTurnstileToken } from "../helpers/turnstile";

const READING_SLUG = "birth-chart";
const CLAIM_TOKEN_RE = /\/gift\/claim\?token=([A-Za-z0-9_-]+)/;

test.beforeEach(async ({ request }) => {
  await resetCapturedState(request);
  await resetE2EDatabase(request);
});

test.describe("Gift claim replay — same token cannot reopen the intake after submit — mock mode", () => {
  test("first claim lands at /gift/intake; second use of same token after submit lands at /gift/claim?invalid=1", async ({
    page,
    request,
  }) => {
    test.setTimeout(3 * 60 * 1000);

    const purchaserEmail = "claim-replay-purchaser@withjosephine.com";

    const intercept = await interceptStripeCheckout(page, {
      readingSlug: READING_SLUG,
      gift: true,
    });

    await page.goto(`/book/${READING_SLUG}/gift`);
    await page.locator(`input[name="deliveryMethod"][value="self_send"]`).check();
    await page.locator("#gift-purchaser-first-name").fill("ReplayPurchaser");
    await page.locator("#gift-purchaser-email").fill(purchaserEmail);
    await page.locator("#gift-recipient-name").fill("ReplayRecipient");
    await page.locator("#gift-message").fill("Claim-replay e2e walk.");
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

    const emails = await getCapturedEmails(request);
    const emailWithClaimUrl = emails.find(
      (e) => e.html && CLAIM_TOKEN_RE.test(e.html),
    );
    expect(emailWithClaimUrl?.html, "self-send confirmation carries claim URL").toBeTruthy();
    const token = CLAIM_TOKEN_RE.exec(emailWithClaimUrl!.html!)![1];

    await page.goto(`/gift/claim?token=${encodeURIComponent(token)}`);
    await expect(page).toHaveURL(/\/gift\/intake/, { timeout: 10_000 });

    await seedIntakeDraft(page, `gift-redeem.${submissionId}`);
    await page.goto("/gift/intake");
    await expect(page).toHaveURL(/\/gift\/intake/, { timeout: 10_000 });
    await clickThroughIntakePages(page, 6);
    await page.locator("#field-art6-consent").check();
    await page.locator("#field-art9-consent").check();
    const coolingOff = page.locator("#field-cooling-off-consent");
    if ((await coolingOff.count()) > 0) {
      await coolingOff.check();
    }
    await page.getByTestId("intake-submit").click();
    await expect(page).toHaveURL(/\/thank-you\/.*gift=1.*redeemed=1/, {
      timeout: 30_000,
    });

    await page.context().clearCookies();
    await page.goto(`/gift/claim?token=${encodeURIComponent(token)}`);
    await expect(page).toHaveURL(/\/gift\/claim\?invalid=1/, { timeout: 10_000 });
  });
});
