// Localhost-mockable sibling to `stripe-roundtrip.spec.ts`.
//
// Targets `pnpm dev` + the fixture sidecar; runs in CI on PRs to `main`. The
// Stripe Payment Link redirect is intercepted browser-side via `page.route`,
// and the spec fires a signed `checkout.session.completed` webhook directly
// at `/api/stripe/webhook` using `Stripe.webhooks.generateTestHeaderString`.
// Sanity writes are captured by the sidecar's mutation log; the Resend
// dry-run hook captures email sends to the sidecar's email log.
//
// Run: E2E_STRIPE_LOCAL=1 pnpm exec playwright test stripe-local
import { expect, test } from "@playwright/test";

import {
  flattenOps,
  getCapturedEmails,
  getCapturedMutations,
  resetCapturedState,
} from "../helpers/captureStore";
import {
  clickThroughIntakePages,
  seedIntakeDraft,
  waitForDraftRestore,
} from "../helpers/intakeDraft";
import { buildCheckoutCompletedPayload, fireCheckoutCompleted } from "../helpers/stripeWebhook";

test.skip(
  process.env.E2E_STRIPE_LOCAL !== "1",
  "Stripe-local spec is opt-in. Set E2E_STRIPE_LOCAL=1.",
);

const READING_SLUG = "birth-chart";

test.beforeEach(async ({ request }) => {
  await resetCapturedState(request);
  await request.post("/api/e2e-reset").catch(() => undefined);
});

test.describe("Stripe round-trip — localhost mocked", () => {
  test("happy path: booking submit → mock Stripe redirect → signed webhook → Sanity mirror + email captured", async ({
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
          location: `/thank-you/${READING_SLUG}?sessionId=${sessionId}&submission=${referenceId}`,
        },
      });
    });

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

    expect(interceptedSessionId).not.toBeNull();
    const submissionId = new URL(page.url()).searchParams.get("submission");
    expect(submissionId).toBeTruthy();

    const webhookResponse = await fireCheckoutCompleted(request, submissionId!, {
      stripeSessionId: interceptedSessionId!,
      customerEmail: "e2e-test@withjosephine.com",
      amountTotal: 9900,
    });
    expect(webhookResponse.status()).toBe(200);

    await page.waitForTimeout(500);

    const mutations = await getCapturedMutations(request);
    const allOps = flattenOps(mutations);
    expect(allOps.length).toBeGreaterThan(0);

    const emails = await getCapturedEmails(request);
    expect(emails.length).toBeGreaterThan(0);
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
    const allOps = flattenOps(mutations);
    expect(
      allOps.some((op) => "id" in op && op.id === submissionId),
      "no Sanity write should reference the unsigned submission id",
    ).toBe(false);
  });

  test("unhappy: signed webhook for unknown submission returns 200 (silent reconcile-deferred)", async ({
    request,
  }) => {
    // The handler logs a warning ("submission … not found … manual reconcile
    // will retry") and returns 200 — the Stripe contract requires 2xx so
    // Stripe doesn't keep retrying. This test pins that contract so we'd
    // notice if it ever flipped to 4xx and started piling up Stripe retries.
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
