// Localhost-mockable sibling to `gift-roundtrip.spec.ts`. Drives the
// purchaser leg through `pnpm dev` + sidecar capture; asserts Sanity
// mutations + Resend captured emails fire as expected.
//
// Recipient-redeem full E2E is deliberately out of scope for v1 — it
// depends on `gift_claim_token` state in D1 that's produced by the
// async Durable Object dispatch path. The unhappy paths here exercise
// the redeem route's gating instead (401 without cookie, 400 with
// missing consent on purchase) — proven regression nets for the bugs
// the staging round-trip caught.
//
// Run: E2E_GIFT_LOCAL=1 pnpm exec playwright test gift-local
import { expect, test, type Page } from "@playwright/test";

import {
  flattenOps,
  getCapturedEmails,
  getCapturedMutations,
  resetCapturedState,
} from "../helpers/captureStore";
import { fireCheckoutCompleted } from "../helpers/stripeWebhook";

test.skip(
  process.env.E2E_GIFT_LOCAL !== "1",
  "Gift-local spec is opt-in. Set E2E_GIFT_LOCAL=1.",
);

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

test.describe("Gift round-trip — localhost mocked", () => {
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

    await page
      .locator(`input[name="deliveryMethod"][value="scheduled"]`)
      .check();
    await page.locator("#gift-purchaser-first-name").fill("LocalPurchaser");
    await page.locator("#gift-purchaser-email").fill("gift-local-purchaser@withjosephine.com");
    await page.locator("#gift-recipient-name").fill("LocalRecipient");
    await page.locator("#gift-recipient-email").fill("gift-local-recipient@withjosephine.com");
    const sendAt = await datetimeLocalPlus(page, 60);
    await page.locator("#gift-send-at").fill(sendAt);
    await page.locator("#gift-message").fill("Local gift round-trip test.");
    await page.locator("#gift-art6-consent").check();
    await page.locator("#gift-cooling-off-consent").check();

    await page.waitForFunction(
      () => {
        const inputs = document.querySelectorAll('input[name="cf-turnstile-response"]');
        for (const input of inputs) {
          if ((input as HTMLInputElement).value.length > 0) return true;
        }
        return false;
      },
      { timeout: 15_000 },
    );

    await page
      .getByRole("button", { name: /(send|schedule|gift)/i })
      .first()
      .click();

    await page.waitForURL(/\/thank-you\//, { timeout: 30_000 });
    expect(interceptedSessionId).not.toBeNull();
    const submissionId = new URL(page.url()).searchParams.get("submission");
    expect(submissionId).toBeTruthy();

    const mutationsAfterCreate = await getCapturedMutations(request);
    expect(
      flattenOps(mutationsAfterCreate).length,
      "submission create should have captured at least one Sanity mutation",
    ).toBeGreaterThan(0);

    const webhookResponse = await fireCheckoutCompleted(request, submissionId!, {
      stripeSessionId: interceptedSessionId!,
      customerEmail: "gift-local-purchaser@withjosephine.com",
      amountTotal: 9900,
    });
    expect(webhookResponse.status()).toBe(200);

    await page.waitForTimeout(750);

    const mutationsAfterPaid = await getCapturedMutations(request);
    expect(flattenOps(mutationsAfterPaid).length).toBeGreaterThan(
      flattenOps(mutationsAfterCreate).length,
    );

    const emails = await getCapturedEmails(request);
    expect(emails.length).toBeGreaterThan(0);
  });

  test("happy: self_send gift purchaser leg succeeds without recipient email", async ({
    page,
  }) => {
    test.setTimeout(2 * 60 * 1000);

    await page.route("https://buy.stripe.com/**", async (route) => {
      const sessionId = `cs_test_${crypto.randomUUID().slice(0, 8)}`;
      await route.fulfill({
        status: 303,
        headers: { location: `/thank-you/${READING_SLUG}?gift=1&sessionId=${sessionId}` },
      });
    });

    await page.goto(`/book/${READING_SLUG}/gift`);
    await page
      .locator(`input[name="deliveryMethod"][value="self_send"]`)
      .check();
    await page.locator("#gift-purchaser-first-name").fill("SelfSendLocal");
    await page.locator("#gift-purchaser-email").fill("gift-local-self@withjosephine.com");
    await page.locator("#gift-recipient-name").fill("RecipientLocal");
    await page.locator("#gift-message").fill("Self-send local round-trip.");
    await page.locator("#gift-art6-consent").check();
    await page.locator("#gift-cooling-off-consent").check();

    await page.waitForFunction(
      () => {
        const inputs = document.querySelectorAll('input[name="cf-turnstile-response"]');
        for (const input of inputs) {
          if ((input as HTMLInputElement).value.length > 0) return true;
        }
        return false;
      },
      { timeout: 15_000 },
    );

    await page
      .getByRole("button", { name: /(send|schedule|gift)/i })
      .first()
      .click();

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
