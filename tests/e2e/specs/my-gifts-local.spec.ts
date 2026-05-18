import { expect, test } from "@playwright/test";

import { resetCapturedState } from "../helpers/captureStore";
import { datetimeLocalPlus } from "../helpers/datetimeLocal";
import { waitForTurnstileToken } from "../helpers/turnstile";

const READING_SLUG = "birth-chart";

test.beforeEach(async ({ request }) => {
  await resetCapturedState(request);
  await request.post("/api/e2e-reset").catch(() => undefined);
});

test.describe("/my-gifts surfaces purchased gifts (B-11) — mock mode", () => {
  test("purchaser sees their gift on /my-gifts after authenticating", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const purchaserEmail = "mygifts-purchaser@withjosephine.com";
    const recipientName = "MyGiftsRecipient";

    await page.route("https://buy.stripe.com/**", async (route) => {
      await route.fulfill({
        status: 303,
        headers: { location: `/thank-you/${READING_SLUG}?gift=1` },
      });
    });

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

    const issueResponse = await page.context().request.post(
      "/api/internal/issue-magic-link",
      {
        data: { email: purchaserEmail },
        headers: {
          "content-type": "application/json",
          "x-admin-token":
            process.env.ADMIN_API_KEY ?? "e2e_admin_api_key_dummy",
        },
      },
    );
    expect(issueResponse.status()).toBe(200);
    const { token } = (await issueResponse.json()) as { token: string };

    await page.goto(`/auth/verify?token=${token}&next=/my-gifts`);
    await page.locator("input[name='email']").fill(purchaserEmail);
    await page.locator("button[type='submit']").click();

    await page.waitForURL(/\/my-gifts/, { timeout: 15_000 });
    await expect(page.getByText(recipientName)).toBeVisible();
  });
});
