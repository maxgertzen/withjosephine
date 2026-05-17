import { expect, type Page, test } from "@playwright/test";

import {
  flattenOps,
  getCapturedEmails,
  getCapturedMutations,
  resetCapturedState,
} from "../helpers/captureStore";
import { fireCheckoutCompleted } from "../helpers/stripeWebhook";
import { waitForTurnstileToken } from "../helpers/turnstile";

const READING_SLUG = "birth-chart";

async function datetimeLocalPlus(page: Page, minutes: number): Promise<string> {
  return page.evaluate((m) => {
    const t = new Date(Date.now() + m * 60_000);
    const pad = (n: number): string => String(n).padStart(2, "0");
    return (
      `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}` +
      `T${pad(t.getHours())}:${pad(t.getMinutes())}`
    );
  }, minutes);
}

test.beforeEach(async ({ request }) => {
  await resetCapturedState(request);
  await request.post("/api/e2e-reset").catch(() => undefined);
});

test.describe("Gift round-trip — mock mode", () => {
  test("happy: scheduled gift purchaser leg → mock Stripe → signed webhook → captured Sanity + email", async ({
    page,
    request,
  }) => {
    test.setTimeout(2 * 60 * 1000);

    let interceptedSessionId: string | null = null;

    await page.route("https://buy.stripe.com/**", async (route) => {
      const url = new URL(route.request().url());
      const referenceId = url.searchParams.get("client_reference_id") ?? "";
      const sessionId = `cs_test_${crypto.randomUUID().slice(0, 8)}`;
      interceptedSessionId = sessionId;
      await route.fulfill({
        status: 303,
        headers: {
          location: `/thank-you/${READING_SLUG}?gift=1&sessionId=${sessionId}&submission=${referenceId}`,
        },
      });
    });

    await page.goto(`/book/${READING_SLUG}/gift`);
    await expect(
      page.getByRole("heading", { level: 1, name: /birth chart/i }),
    ).toBeVisible();

    await page.locator(`input[name="deliveryMethod"][value="scheduled"]`).check();
    await page.locator("#gift-purchaser-first-name").fill("LocalPurchaser");
    await page.locator("#gift-purchaser-email").fill("gift-local-purchaser@withjosephine.com");
    await page.locator("#gift-recipient-name").fill("LocalRecipient");
    await page.locator("#gift-recipient-email").fill("gift-local-recipient@withjosephine.com");
    const sendAt = await datetimeLocalPlus(page, 60);
    await page.locator("#gift-send-at").fill(sendAt);
    await page.locator("#gift-message").fill("Local gift round-trip test.");
    await page.locator("#gift-art6-consent").check();
    await page.locator("#gift-cooling-off-consent").check();

    await waitForTurnstileToken(page);

    await page.getByRole("button", { name: /(send|schedule|gift)/i }).first().click();

    await page.waitForURL(/\/thank-you\//, { timeout: 30_000 });
    expect(interceptedSessionId).not.toBeNull();
    const submissionId = new URL(page.url()).searchParams.get("submission");
    expect(submissionId).toBeTruthy();

    const mutationsAfterCreate = await getCapturedMutations(request);
    expect(flattenOps(mutationsAfterCreate).length).toBeGreaterThan(0);

    const webhookResponse = await fireCheckoutCompleted(request, submissionId!, {
      stripeSessionId: interceptedSessionId!,
      customerEmail: "gift-local-purchaser@withjosephine.com",
      amountTotal: 9900,
    });
    expect(webhookResponse.status()).toBe(200);

    await expect
      .poll(async () => flattenOps(await getCapturedMutations(request)).length, {
        timeout: 5_000,
      })
      .toBeGreaterThan(flattenOps(mutationsAfterCreate).length);

    await expect
      .poll(async () => (await getCapturedEmails(request)).length, { timeout: 5_000 })
      .toBeGreaterThan(0);
  });

  test("happy: self_send gift purchaser leg succeeds without recipient email", async ({ page }) => {
    test.setTimeout(2 * 60 * 1000);

    await page.route("https://buy.stripe.com/**", async (route) => {
      const sessionId = `cs_test_${crypto.randomUUID().slice(0, 8)}`;
      await route.fulfill({
        status: 303,
        headers: { location: `/thank-you/${READING_SLUG}?gift=1&sessionId=${sessionId}` },
      });
    });

    await page.goto(`/book/${READING_SLUG}/gift`);
    await page.locator(`input[name="deliveryMethod"][value="self_send"]`).check();
    await page.locator("#gift-purchaser-first-name").fill("SelfSendLocal");
    await page.locator("#gift-purchaser-email").fill("gift-local-self@withjosephine.com");
    await page.locator("#gift-recipient-name").fill("RecipientLocal");
    await page.locator("#gift-message").fill("Self-send local round-trip.");
    await page.locator("#gift-art6-consent").check();
    await page.locator("#gift-cooling-off-consent").check();

    await waitForTurnstileToken(page);

    await page.getByRole("button", { name: /(send|schedule|gift)/i }).first().click();

    await page.waitForURL(/\/thank-you\//, { timeout: 30_000 });
  });

  test("unhappy: gift-redeem without claim cookie returns 401", async ({ request }) => {
    const response = await request.post("/api/booking/gift-redeem", {
      data: {
        readingSlug: READING_SLUG,
        values: {},
        turnstileToken: "bypass",
        art6Consent: true,
        art9Consent: true,
        coolingOffConsent: true,
        submissionId: crypto.randomUUID(),
      },
      headers: { "content-type": "application/json" },
    });
    expect(response.status()).toBe(401);
    const json = (await response.json()) as { error?: string };
    expect(json.error).toMatch(/claim session/i);
  });

  test("unhappy: gift purchase with missing consent returns 400", async ({ request }) => {
    const response = await request.post("/api/booking/gift", {
      data: {
        readingSlug: READING_SLUG,
        deliveryMethod: "self_send",
        purchaserFirstName: "Test",
        purchaserEmail: "noconsent-gift@withjosephine.com",
        recipientFirstName: "Recip",
        giftMessage: "test",
        turnstileToken: "bypass",
        art6Consent: false,
        coolingOffConsent: false,
      },
      headers: { "content-type": "application/json" },
    });
    expect(response.status()).toBe(400);
  });
});
