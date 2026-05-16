// End-to-end Stripe sandbox round-trip against staging — the watchable
// counterpart to LAUNCH_SMOKE_TEST_PLAN.md Stage B-1. Run with:
//   E2E_STRIPE_ROUNDTRIP=1 pnpm exec playwright test --headed
// Requires .env.staging sourced.
import { expect, test } from "@playwright/test";

import {
  clickThroughIntakePages,
  seedIntakeDraft,
  waitForDraftRestore,
} from "../helpers/intakeDraft";
import { fillStripeCheckout } from "../helpers/stripeCheckout";

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

    await fillStripeCheckout(page, stripeTestEmail);

    await page.waitForURL(/\/thank-you\//, { timeout: 60_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/birth chart/i).first()).toBeVisible();
  });
});
