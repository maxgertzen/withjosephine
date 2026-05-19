import { expect, test } from "@playwright/test";

import { resetCapturedState } from "../helpers/captureStore";
import { datetimeLocalPlus } from "../helpers/datetimeLocal";
import { fireCheckoutCompleted } from "../helpers/stripeWebhook";
import { waitForTurnstileToken } from "../helpers/turnstile";

const READING_SLUG = "birth-chart";

test.beforeEach(async ({ request }) => {
  await resetCapturedState(request);
  await request.post("/api/e2e-reset").catch(() => undefined);
});

test.describe("Send-now — purchaser fires claim email ahead of schedule (D-10) — mock mode", () => {
  test("arms via 5s confirm, posts to /send-now, intercepted payload + 200 round-trip", async ({
    page,
    request,
  }) => {
    test.setTimeout(2 * 60 * 1000);

    const purchaserEmail = "send-now-purchaser@withjosephine.com";

    let interceptedSessionId: string | null = null;
    let interceptedSubmissionId: string | null = null;

    await page.route("https://buy.stripe.com/**", async (route) => {
      const url = new URL(route.request().url());
      const submissionId = url.searchParams.get("client_reference_id") ?? "";
      const sessionId = `cs_test_${crypto.randomUUID().slice(0, 8)}`;
      interceptedSessionId = sessionId;
      interceptedSubmissionId = submissionId;
      await route.fulfill({
        status: 303,
        headers: {
          location: `/thank-you/${READING_SLUG}?gift=1&sessionId=${sessionId}&submission=${submissionId}`,
        },
      });
    });

    // Book a SCHEDULED gift — send-now only makes sense on scheduled rows.
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

    expect(interceptedSubmissionId).not.toBeNull();
    expect(interceptedSessionId).not.toBeNull();

    // Mark submission paid + persisted via the Stripe webhook.
    const webhookResponse = await fireCheckoutCompleted(request, interceptedSubmissionId!, {
      stripeSessionId: interceptedSessionId!,
      customerEmail: purchaserEmail,
      amountTotal: 9900,
    });
    expect(webhookResponse.status()).toBe(200);

    // Authenticate to /my-gifts via magic link.
    const issueResponse = await page.context().request.post(
      "/api/internal/issue-magic-link",
      {
        data: { email: purchaserEmail },
        headers: {
          "content-type": "application/json",
          "x-admin-token": process.env.ADMIN_API_KEY ?? "e2e_admin_api_key_dummy",
        },
      },
    );
    expect(issueResponse.status()).toBe(200);
    const { token } = (await issueResponse.json()) as { token: string };

    await page.goto(`/auth/verify?token=${token}&next=/my-gifts`);
    await page.locator("input[name='email']").fill(purchaserEmail);
    await page.locator("button[type='submit']").click();
    await page.waitForURL(/\/my-gifts/, { timeout: 15_000 });

    // The scheduled gift card surfaces the "Send now" CTA.
    const sendNowCta = page.getByRole("button", { name: /^send now$/i });
    await expect(sendNowCta).toBeVisible();

    // Tap once to arm — replaces initial CTA with the confirm CTA.
    await sendNowCta.click();
    const confirmCta = page.getByRole("button", { name: /tap again to send today/i });
    await expect(confirmCta).toBeVisible();

    // Intercept the POST and assert the route landed with the right shape.
    let captured: { url: string; method: string } | null = null;
    await page.route(`**/api/gifts/${interceptedSubmissionId}/send-now`, async (route) => {
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
      `/api/gifts/${interceptedSubmissionId}/send-now`,
    );
  });
});
