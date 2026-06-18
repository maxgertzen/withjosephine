import { expect, test } from "@playwright/test";

import {
  flattenOps,
  getCapturedEmails,
  getCapturedMutations,
  resetCapturedState,
} from "../helpers/captureStore";
import { resetE2EDatabase } from "../helpers/e2eReset";
import {
  clickThroughIntakePages,
  seedIntakeDraft,
  waitForDraftRestore,
} from "../helpers/intakeDraft";
import { interceptStripeCheckout } from "../helpers/stripeCheckout";
import { buildCheckoutCompletedPayload, fireCheckoutCompleted } from "../helpers/stripeWebhook";

const READING_SLUG = "birth-chart";

test.beforeEach(async ({ request }) => {
  await resetCapturedState(request);
  await resetE2EDatabase(request);
});

test.describe("Stripe round-trip — mock mode", () => {
  test("happy path: booking submit → mock Stripe redirect → signed webhook → Sanity mirror + email captured", async ({
    page,
    request,
  }) => {
    test.setTimeout(2 * 60 * 1000);

    const intercept = await interceptStripeCheckout(page, { readingSlug: READING_SLUG });

    await seedIntakeDraft(page, READING_SLUG);

    await page.goto(`/book/${READING_SLUG}`);
    await expect(
      page.getByRole("heading", { level: 1, name: /birth chart/i }),
    ).toBeVisible();
    await page.locator(`a[href="/book/${READING_SLUG}/letter"]`).click();
    await page.waitForURL(/\/letter/);
    await page.locator(`a[href="/book/${READING_SLUG}/intake"]`).click();
    await page.waitForURL(/\/intake/);

    await waitForDraftRestore(page);
    await clickThroughIntakePages(page, 6);

    await page.locator("#field-art6-consent").check();
    await page.locator("#field-art9-consent").check();
    await page.locator("#field-cooling-off-consent").check();

    await page.getByTestId("intake-submit").click();

    await page.waitForURL(/\/thank-you\//, { timeout: 30_000 });

    const { sessionId, submissionId } = await intercept.captured;
    expect(sessionId).toBeTruthy();
    expect(submissionId).toBeTruthy();

    const webhookResponse = await fireCheckoutCompleted(request, submissionId, {
      stripeSessionId: sessionId,
      customerEmail: "e2e-test@withjosephine.com",
      amountTotal: 9900,
    });
    expect(webhookResponse.status()).toBe(200);

    await expect
      .poll(async () => flattenOps(await getCapturedMutations(request)).length, {
        timeout: 5_000,
      })
      .toBeGreaterThan(0);

    await expect
      .poll(async () => (await getCapturedEmails(request)).length, { timeout: 5_000 })
      .toBeGreaterThan(0);
  });

  test("intake submit button disables immediately on click (u7usxewf)", async ({ page }) => {
    test.setTimeout(60_000);

    // Hold the booking POST open so the in-flight pending state is observable.
    // The fix sets pending synchronously at click, before this request fires.
    let releaseBooking: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      releaseBooking = resolve;
    });
    await page.route("**/api/booking", async (route) => {
      await gate;
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: "{}",
      });
    });

    await seedIntakeDraft(page, READING_SLUG);
    await page.goto(`/book/${READING_SLUG}`);
    await page.locator(`a[href="/book/${READING_SLUG}/letter"]`).click();
    await page.waitForURL(/\/letter/);
    await page.locator(`a[href="/book/${READING_SLUG}/intake"]`).click();
    await page.waitForURL(/\/intake/);

    await waitForDraftRestore(page);
    await clickThroughIntakePages(page, 6);

    await page.locator("#field-art6-consent").check();
    await page.locator("#field-art9-consent").check();
    await page.locator("#field-cooling-off-consent").check();

    const submit = page.getByTestId("intake-submit");
    await submit.click();

    // Disabled while the (gated) POST is in flight — no dead first beat.
    await expect(submit).toBeDisabled();

    releaseBooking();
  });

  test("unhappy: bad webhook signature returns 400 + no Sanity write captured", async ({
    request,
  }) => {
    const submissionId = crypto.randomUUID();
    const body = JSON.stringify({
      id: "evt_test_bad_sig",
      type: "checkout.session.completed",
      data: { object: { id: "cs_test_bad", client_reference_id: submissionId } },
    });
    const response = await request.post("/api/stripe/webhook", {
      headers: {
        "stripe-signature": "t=0,v1=deadbeef",
        "content-type": "application/json",
      },
      data: body,
    });
    expect(response.status()).toBe(400);

    const mutations = await getCapturedMutations(request);
    expect(
      flattenOps(mutations).some((op) => "id" in op && op.id === submissionId),
    ).toBe(false);
  });

  test("unhappy: signed webhook for unknown submission returns 200 (Stripe-contract pin)", async ({
    request,
  }) => {
    const orphanId = crypto.randomUUID();
    const { body, signature } = buildCheckoutCompletedPayload(orphanId, {
      customerEmail: "orphan@withjosephine.com",
    });
    const response = await request.post("/api/stripe/webhook", {
      headers: { "stripe-signature": signature, "content-type": "application/json" },
      data: body,
    });
    expect(response.status()).toBe(200);
  });

  test("unhappy: booking POST without consent returns 400", async ({ request }) => {
    const response = await request.post("/api/booking", {
      data: {
        readingSlug: READING_SLUG,
        values: { email: "noconsent@withjosephine.com" },
        turnstileToken: "bypass",
        art6Consent: false,
        art9Consent: false,
        coolingOffConsent: false,
      },
      headers: { "content-type": "application/json" },
    });
    expect(response.status()).toBe(400);
    const json = (await response.json()) as { error?: string };
    expect(json.error).toMatch(/Art\.?\s*6|acknowledg/i);
  });
});
