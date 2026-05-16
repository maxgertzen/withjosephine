// Watchable end-to-end Stripe sandbox round-trip against staging.
// Env-gated by E2E_STRIPE_ROUNDTRIP=1; ignored by the default chromium project.
//
// Why this spec exists: vitest covers each booking component, the fixture-
// sidecar Playwright suite covers integrated UI behavior against a mocked
// Sanity. Neither hits real Stripe + real staging Sanity + real Resend.
// This spec is the engineering-tool equivalent of LAUNCH_SMOKE_TEST_PLAN.md
// Stage B-1, runnable on demand so the full purchaser flow is observable
// in a Chromium window from entry → checkout → thank-you.
//
// Run: `E2E_STRIPE_ROUNDTRIP=1 pnpm exec playwright test --headed`
// Requires .env.staging sourced (CF_ACCESS_CLIENT_ID + CF_ACCESS_CLIENT_SECRET).
import { expect, type Page,test } from "@playwright/test";

import {
  clickThroughIntakePages,
  seedIntakeDraft,
  waitForDraftRestore,
} from "../helpers/intakeDraft";

const accessClientId = process.env.CF_ACCESS_CLIENT_ID;
const accessClientSecret = process.env.CF_ACCESS_CLIENT_SECRET;
const stripeTestEmail =
  process.env.STRIPE_ROUNDTRIP_EMAIL ?? "stripe-roundtrip@withjosephine.com";

test.skip(
  process.env.E2E_STRIPE_ROUNDTRIP !== "1",
  "Stripe round-trip spec is opt-in. Set E2E_STRIPE_ROUNDTRIP=1.",
);

test.skip(
  !accessClientId || !accessClientSecret,
  "CF Access service-token env vars missing. Source www/.env.staging first.",
);

test.use({
  extraHTTPHeaders: {
    "CF-Access-Client-Id": accessClientId ?? "",
    "CF-Access-Client-Secret": accessClientSecret ?? "",
  },
});

async function fillStripeCheckout(page: Page): Promise<void> {
  // Stripe Payment Links use a hosted page. Field shapes are stable enough
  // that name-based locators work; we set generous timeouts because Stripe
  // mounts fields progressively.
  await page.waitForURL(/checkout\.stripe\.com|buy\.stripe\.com/, {
    timeout: 30_000,
  });
  await page.locator('input[name="email"]').first().fill(stripeTestEmail);
  await page.locator('input[name="cardNumber"]').fill("4242 4242 4242 4242");
  await page.locator('input[name="cardExpiry"]').fill("12 / 34");
  await page.locator('input[name="cardCvc"]').fill("123");
  const zip = page.locator('input[name="billingPostalCode"]');
  if (await zip.count()) await zip.fill("12345");
  const cardName = page.locator('input[name="billingName"]');
  if (await cardName.count()) await cardName.fill("Ada Lovelace");
  await page.getByTestId("hosted-payment-submit-button").click();
}

test.describe("Stripe sandbox round-trip — staging", () => {
  test("birth-chart: entry → letter → intake → Stripe → thank-you", async ({
    page,
  }) => {
    test.setTimeout(4 * 60 * 1000);

    await seedIntakeDraft(page, "birth-chart");

    await page.goto("/book/birth-chart");
    await expect(
      page.getByRole("heading", { level: 1, name: /birth chart/i }),
    ).toBeVisible();

    // Entry → letter. CTA copy is CMS-driven (`bookReadingCtaText`), but the
    // href comes from `BOOKING_ROUTES.letter(slug)` and is deterministic.
    await page.locator('a[href="/book/birth-chart/letter"]').click();
    await page.waitForURL(/\/book\/birth-chart\/letter/, { timeout: 15_000 });

    // Letter → intake. Same pattern: `dropCapCta` is CMS-driven, href is not.
    await page.locator('a[href="/book/birth-chart/intake"]').click();
    await page.waitForURL(/\/book\/birth-chart\/intake/, { timeout: 15_000 });

    await waitForDraftRestore(page);
    await clickThroughIntakePages(page, 6);

    await page.locator("#field-art6-consent").check();
    await page.locator("#field-art9-consent").check();
    await page.locator("#field-cooling-off-consent").check();

    await page.getByTestId("intake-submit").click();

    await fillStripeCheckout(page);

    await page.waitForURL(/\/thank-you\//, { timeout: 60_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/birth chart/i).first()).toBeVisible();
  });
});
