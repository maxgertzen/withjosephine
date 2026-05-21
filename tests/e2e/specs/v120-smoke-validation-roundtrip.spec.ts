// QA validation walk for the 2026-05-21 smoke-walk fix arc (PRs #160-#165 on
// release/v1.2.0). Browser-side proof for Stories 1, 3, 4 against
// https://staging.withjosephine.com. Story 2 (U1 listen-page) is intentionally
// not exercised here — it needs delivered assets uploaded by Becky and is
// reported as SKIPPED-NEEDS-MANUAL in the QA report.
//
// Spec name ends with -roundtrip.spec.ts so Playwright runs it in sandbox mode.
import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import {
  clickThroughIntakePages,
  seedIntakeDraft,
  waitForDraftRestore,
} from "../helpers/intakeDraft";
import { cleanupSandboxResidue } from "../helpers/sandboxResidueCleanup";
import {
  forceD1Mirror,
  uploadDummyVoiceAndPdf,
} from "../helpers/sanityE2EAssets";
import {
  accessHeadersOrEmpty,
  findSubmissionIdByStripeSessionId,
  issueMagicLink,
  pollUntilPaid,
} from "../helpers/stagingApi";
import { fillStripeCheckout } from "../helpers/stripeCheckout";
import { stubTurnstile } from "../helpers/turnstileStub";

test.use({ extraHTTPHeaders: accessHeadersOrEmpty() });

const stripeTestEmail =
  process.env.STRIPE_ROUNDTRIP_EMAIL ?? "v120-qa+stripe@withjosephine.com";

test.describe("v1.2.0 smoke-walk QA validation — staging", () => {
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

  test("STORY 1a — /my-gifts renders magic-link sign-in form (C3 net)", async ({
    browser,
  }) => {
    // Incognito context to guarantee no session cookie leaks across stories.
    const context = await browser.newContext({
      extraHTTPHeaders: accessHeadersOrEmpty(),
    });
    const page = await context.newPage();
    try {
      await page.goto("/my-gifts");
      const form = page.locator('form[action="/api/auth/magic-link"]');
      await expect(form).toBeVisible();
      // Email input + submit are the load-bearing affordance.
      await expect(form.locator('input[type="email"], input[name="email"]'))
        .toBeVisible();
    } finally {
      await context.close();
    }
  });

  test("STORY 1b — /my-readings renders magic-link sign-in form (C3 net)", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      extraHTTPHeaders: accessHeadersOrEmpty(),
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

  test("STORY 3 — J1a self-purchase: entry → letter → intake → Stripe → thank-you (no 'there')", async ({
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
    // C4-class regression net: thank-you page must not address the customer
    // with the literal placeholder word "there".
    await expect(page.locator("body")).not.toContainText(/Thank you, there/i);
  });

  test("STORY 4 — J2 gift self-send purchaser thank-you (C4 net for purchaser surface)", async ({
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
    // self_send omits recipient email — purchaser will forward the claim link.

    await page.locator("#gift-message").fill(giftMessage);
    await page.locator("#gift-art6-consent").check();
    await page.locator("#gift-cooling-off-consent").check();

    // Same Turnstile-wait pattern as gift-roundtrip — invisible widget can
    // still be mid-execution at submit-click. Wait for the token to populate.
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

    // Heading should personalize with purchaser first name — not "Welcome" /
    // "there" / generic fallback. Body sweep also catches "Thank you, there".
    // The C4 net is the heading content, not the URL query shape (Stripe
    // Payment Link redirect carries sessionId; the gift=1 marker may live on
    // the purchaser-specific success_url which we don't gate on here).
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(new RegExp(purchaserFirstName, "i"));
    await expect(page.locator("body")).not.toContainText(/Thank you, there/i);
  });

  test("STORY 2 — U1 listen-page strips leading 'The ' from readingName ('Birth Chart Reading', not 'The Birth Chart Reading')", async ({
    page,
    context,
  }) => {
    test.setTimeout(5 * 60 * 1000);

    const runId = randomUUID().slice(0, 8);
    const email = `v120-qa+u1-${runId}@withjosephine.com`;

    // Buy a Birth Chart Reading (the reading whose Sanity name starts with
    // "The " — exact trigger for U1). Use the same intake walk as Story 3.
    await seedIntakeDraft(page, "birth-chart", { values: { email } });
    await page.goto("/book/birth-chart");
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
    await fillStripeCheckout(page, email);
    await page.waitForURL(/\/thank-you\//, { timeout: 90_000 });

    const stripeSessionId = new URL(page.url()).searchParams.get("sessionId");
    if (!stripeSessionId) throw new Error("Stripe redirect missing sessionId");
    const submissionId = await findSubmissionIdByStripeSessionId(stripeSessionId);

    const paid = await pollUntilPaid(submissionId, { timeoutMs: 45_000 });
    expect(paid, "Stripe webhook should mark submission paid").toBe(true);

    // Becky-side delivery — upload dummy assets + force Sanity → D1 mirror so
    // the listen page resolves the delivered surface without waiting on cron.
    await uploadDummyVoiceAndPdf(submissionId);
    const mirror = await forceD1Mirror(submissionId);
    expect(mirror.awaitingAssets, "force-mode should see Sanity assets").toBe(0);

    // Cold visit + magic-link round to land on /listen/<id>?welcome=1.
    await context.clearCookies();
    await page.goto(`/listen/${submissionId}`);
    const signInForm = page.locator('form[action="/api/auth/magic-link"]');
    await expect(signInForm).toBeVisible();
    await signInForm.locator('input[name="email"]').fill(email);
    await signInForm.locator('button[type="submit"]').click();
    await page.waitForURL(new RegExp(`/listen/${submissionId}\\?sent=1`), {
      timeout: 15_000,
    });
    const { verifyUrl: baseVerifyUrl } = await issueMagicLink(email);
    const verifyUrl = new URL(baseVerifyUrl);
    verifyUrl.searchParams.set("next", `/listen/${submissionId}`);
    await page.goto(verifyUrl.toString());
    const confirmForm = page.locator(
      'form[action="/api/auth/magic-link/verify"]',
    );
    await expect(confirmForm).toBeVisible();
    await confirmForm.locator('input[name="email"]').fill(email);
    await confirmForm.locator('button[type="submit"]').click();
    await page.waitForURL(new RegExp(`/listen/${submissionId}\\?welcome=1`), {
      timeout: 15_000,
    });

    // U1 assertion: heading must NOT contain "Your The ..." double article.
    // The reading name in Sanity is "The Birth Chart Reading"; the strip-on-
    // interpolate fix should make it render as "Your Birth Chart Reading ..."
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    const headingText = await heading.textContent();
    expect(headingText, "listen-page heading should exist").toBeTruthy();
    expect(headingText ?? "").not.toMatch(/Your\s+The\s/i);
  });
});
