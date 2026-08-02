import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { SANDBOX_DOMAIN, SANDBOX_EMAIL_PREFIXES } from "@/lib/booking/sandboxEmails";

import {
  clickThroughIntakePages,
  seedIntakeDraft,
  waitForDraftRestore,
} from "../helpers/intakeDraft";
import { cleanupSandboxResidue } from "../helpers/sandboxResidueCleanup";
import { sandboxRequestHeaders } from "../helpers/stagingApi";
import { fillStripeCheckout } from "../helpers/stripeCheckout";
import { stubTurnstile } from "../helpers/turnstileStub";

test.use({ extraHTTPHeaders: sandboxRequestHeaders() });

test.describe("Stripe sandbox round-trip — staging", () => {
  test.beforeAll(async () => {
    const { sanityDeleted } = await cleanupSandboxResidue({
      emailPrefix: SANDBOX_EMAIL_PREFIXES.stripeRoundtrip,
    });
    console.log(
      `[stripe-roundtrip] preflight wipe: D1 cleared + ${sanityDeleted} Sanity submission(s) deleted`,
    );
  });

  test.beforeEach(async ({ page }) => {
    await stubTurnstile(page);
  });

  test("birth-chart: form → Stripe → thank-you", async ({
    page,
  }) => {
    test.setTimeout(4 * 60 * 1000);

    const runId = randomUUID().slice(0, 8);
    const email = `${SANDBOX_EMAIL_PREFIXES.stripeRoundtrip}${runId}${SANDBOX_DOMAIN}`;
    const stripeTestEmail = process.env.STRIPE_ROUNDTRIP_EMAIL ?? email;

    await seedIntakeDraft(page, "birth-chart", { values: { email } });

    await page.goto("/book/birth-chart");
    await expect(page.getByRole("heading", { level: 1, name: /before we begin/i })).toBeVisible();
    await expect(page.getByRole("banner")).toContainText(/birth chart/i);

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
