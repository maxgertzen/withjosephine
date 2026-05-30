import { expect, type Page, test } from "@playwright/test";

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

interface PurchaseArgs {
  purchaserFirst: string;
  purchaserEmail: string;
  recipientName: string;
  recipientEmail: string;
}

async function purchaseScheduledGift(
  page: Page,
  args: PurchaseArgs,
): Promise<string> {
  const intercept = await interceptStripeCheckout(page, {
    readingSlug: READING_SLUG,
    gift: true,
  });

  await page.goto(`/book/${READING_SLUG}/gift`);
  await page.locator(`input[name="deliveryMethod"][value="scheduled"]`).check();
  await page.locator("#gift-purchaser-first-name").fill(args.purchaserFirst);
  await page.locator("#gift-purchaser-email").fill(args.purchaserEmail);
  await page.locator("#gift-recipient-name").fill(args.recipientName);
  await page.locator("#gift-recipient-email").fill(args.recipientEmail);
  const sendAt = await datetimeLocalPlus(page, 60 * 24);
  await page.locator("#gift-send-at").fill(sendAt);
  await page.locator("#gift-message").fill("Cross-purchaser leak coverage.");
  await page.locator("#gift-art6-consent").check();
  await page.locator("#gift-cooling-off-consent").check();
  await waitForTurnstileToken(page);
  await page
    .getByRole("button", { name: /(send|schedule|gift)/i })
    .first()
    .click();
  await page.waitForURL(/\/thank-you\//, { timeout: 30_000 });

  const { submissionId } = await intercept.captured;
  await intercept.unroute();
  return submissionId;
}

test.describe("Cross-purchaser gift isolation — mock mode", () => {
  test("B cannot view or mutate A's gifts on /my-gifts or via mutation routes", async ({
    page,
    context,
    request,
  }) => {
    test.setTimeout(3 * 60 * 1000);

    const A_EMAIL = "leak-a-purchaser@withjosephine.com";
    const B_EMAIL = "leak-b-purchaser@withjosephine.com";
    const A_RECIPIENT_1 = "AlphaRecipientOne";
    const A_RECIPIENT_2 = "AlphaRecipientTwo";
    const B_RECIPIENT = "BravoRecipientOnly";

    const aGift1Id = await purchaseScheduledGift(page, {
      purchaserFirst: "Alpha",
      purchaserEmail: A_EMAIL,
      recipientName: A_RECIPIENT_1,
      recipientEmail: "a-r1@example.com",
    });
    await context.clearCookies();

    await purchaseScheduledGift(page, {
      purchaserFirst: "Alpha",
      purchaserEmail: A_EMAIL,
      recipientName: A_RECIPIENT_2,
      recipientEmail: "a-r2@example.com",
    });
    await context.clearCookies();

    await purchaseScheduledGift(page, {
      purchaserFirst: "Bravo",
      purchaserEmail: B_EMAIL,
      recipientName: B_RECIPIENT,
      recipientEmail: "b-r1@example.com",
    });

    const unauthRes = await request.post(
      `/api/gifts/${aGift1Id}/cancel-auto-send`,
    );
    expect(unauthRes.status()).toBe(401);

    await signInViaMagicLink(page, { email: B_EMAIL, next: "/my-readings" });

    await expect(page.getByText(B_RECIPIENT)).toBeVisible();
    await expect(page.getByText(A_RECIPIENT_1)).toHaveCount(0);
    await expect(page.getByText(A_RECIPIENT_2)).toHaveCount(0);

    // 404 (not 401/403) is load-bearing — authorizeGiftPurchaser collapses
    // unknown-id and cross-user to the same shape so an attacker cannot
    // enumerate gift IDs by status code. Flipping this to 403 is a regression.
    const crossUserRes = await page.context().request.post(
      `/api/gifts/${aGift1Id}/cancel-auto-send`,
    );
    expect(crossUserRes.status()).toBe(404);
  });
});
