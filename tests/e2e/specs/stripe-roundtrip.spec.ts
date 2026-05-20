import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import {
  clickThroughIntakePages,
  seedIntakeDraft,
  waitForDraftRestore,
} from "../helpers/intakeDraft";
import { cleanupSandboxResidue } from "../helpers/sandboxResidueCleanup";
import { accessHeadersOrEmpty } from "../helpers/stagingApi";
import { fillStripeCheckout } from "../helpers/stripeCheckout";
import { stubTurnstile } from "../helpers/turnstileStub";

test.use({ extraHTTPHeaders: accessHeadersOrEmpty() });

test.describe("Stripe sandbox round-trip — staging", () => {
  test.beforeAll(async () => {
    const { sanityDeleted } = await cleanupSandboxResidue({
      emailPrefix: "stripe-roundtrip+",
    });
    console.log(
      `[stripe-roundtrip] preflight wipe: D1 cleared + ${sanityDeleted} Sanity submission(s) deleted`,
    );
  });

  test.beforeEach(async ({ page }) => {
    await stubTurnstile(page);
  });

  test("birth-chart: entry → letter → intake → Stripe → thank-you", async ({
    page,
  }) => {
    test.setTimeout(4 * 60 * 1000);

    const runId = randomUUID().slice(0, 8);
    const email = `stripe-roundtrip+${runId}@withjosephine.com`;
    const stripeTestEmail = process.env.STRIPE_ROUNDTRIP_EMAIL ?? email;

    await seedIntakeDraft(page, "birth-chart", { values: { email } });

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
