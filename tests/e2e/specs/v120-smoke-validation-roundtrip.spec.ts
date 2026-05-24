import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

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

const stripeTestEmail =
  process.env.STRIPE_ROUNDTRIP_EMAIL ?? "v120-qa+stripe@withjosephine.com";

test.describe("v1.2.0 QA validation — staging", () => {
  test.beforeAll(async () => {
    const { sanityDeleted } = await cleanupSandboxResidue({
      emailPrefix: "v120-qa+",
    });
    console.log(
      `[v120-qa] preflight wipe: D1 cleared + ${sanityDeleted} Sanity submission(s) deleted`,
    );
  });

  test.beforeEach(async ({ page }) => {
    await stubTurnstile(page);
  });

  test("/my-gifts renders the magic-link sign-in form", async ({ browser }) => {
    const context = await browser.newContext({
      extraHTTPHeaders: sandboxRequestHeaders(),
    });
    const page = await context.newPage();
    try {
      await page.goto("/my-gifts");
      const form = page.locator('form[action="/api/auth/magic-link"]');
      await expect(form).toBeVisible();
      await expect(form.locator('input[type="email"], input[name="email"]'))
        .toBeVisible();
    } finally {
      await context.close();
    }
  });

  test("/my-readings renders the magic-link sign-in form", async ({ browser }) => {
    const context = await browser.newContext({
      extraHTTPHeaders: sandboxRequestHeaders(),
    });
    const page = await context.newPage();
    try {
      await page.goto("/my-readings");
      const form = page.locator('form[action="/api/auth/magic-link"]');
      await expect(form).toBeVisible();
      await expect(form.locator('input[type="email"], input[name="email"]'))
        .toBeVisible();
    } finally {
      await context.close();
    }
  });

  test("self-purchase: entry → letter → intake → Stripe → thank-you renders without 'there' fallback", async ({
    page,
  }) => {
    test.setTimeout(4 * 60 * 1000);

    const runId = randomUUID().slice(0, 8);
    const email = `v120-qa+${runId}@withjosephine.com`;

    await seedIntakeDraft(page, "birth-chart", { values: { email } });

    await page.goto("/book/birth-chart");
    await expect(
      page.getByRole("heading", { level: 1, name: /birth chart/i }),
    ).toBeVisible();

    await page.locator('a[href="/book/birth-chart/letter"]').click();
    await page.waitForURL(/\/book\/birth-chart\/letter/, { timeout: 15_000 });

    await page.locator('a[href="/book/birth-chart/intake"]').click();
    await page.waitForURL(/\/book\/birth-chart\/intake/, { timeout: 15_000 });

    await waitForDraftRestore(page);
    await clickThroughIntakePages(page, 6);

    await page.locator("#field-art6-consent").check();
    await page.locator("#field-art9-consent").check();
    await page.locator("#field-cooling-off-consent").check();

    await page.getByTestId("intake-submit").click();

    await fillStripeCheckout(page, stripeTestEmail);

    await page.waitForURL(/\/thank-you\//, { timeout: 90_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/Thank you, there/i);
  });

  test("gift self-send purchaser thank-you personalises with purchaser first name", async ({
    page,
  }) => {
    test.setTimeout(4 * 60 * 1000);

    const runId = randomUUID().slice(0, 8);
    const purchaserFirstName = "Ada";
    const purchaserEmail = `v120-qa+gift-${runId}@withjosephine.com`;
    const recipientFirstName = "Grace";
    const giftMessage =
      "Sending you the stars for your birthday — with love from Ada.";

    await page.goto("/book/birth-chart/gift");
    await expect(
      page.getByRole("heading", { level: 1, name: /birth chart/i }),
    ).toBeVisible();

    await page
      .locator('input[name="deliveryMethod"][value="self_send"]')
      .check();

    await page.locator("#gift-purchaser-first-name").fill(purchaserFirstName);
    await page.locator("#gift-purchaser-email").fill(purchaserEmail);
    await page.locator("#gift-recipient-name").fill(recipientFirstName);

    await page.locator("#gift-message").fill(giftMessage);
    await page.locator("#gift-art6-consent").check();
    await page.locator("#gift-cooling-off-consent").check();

    await page.waitForFunction(
      () => {
        const inputs = document.querySelectorAll(
          'input[name="cf-turnstile-response"]',
        );
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

    await fillStripeCheckout(page, stripeTestEmail);

    await page.waitForURL(/\/thank-you\//, { timeout: 90_000 });

    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(new RegExp(purchaserFirstName, "i"));
    await expect(page.locator("body")).not.toContainText(/Thank you, there/i);
  });
});
