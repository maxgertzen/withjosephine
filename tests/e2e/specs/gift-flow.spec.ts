import { expect, test } from "@playwright/test";

import { READINGS_FOR_SMOKE as READINGS } from "../fixtures/readings";

test.describe("Gift reading selector routes to correct intake (Issue #6)", () => {
  test.fixme(
    true,
    "Unblocked by P4.4 — Max verifies Birth Chart Sanity doc's `stripePaymentLink` correctness; P1.10 GROQ contract enforces uniqueness. Today's Issue #6 hypothesis: Birth Chart's stripePaymentLink points at Soul Blueprint's Payment Link in production Sanity.",
  );

  for (const reading of READINGS) {
    test(`/gift/${reading.slug} renders the correct reading name`, async ({ page }) => {
      await page.goto(`/gift/${reading.slug}`);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(reading.expectedName);
    });
  }
});

test.describe("Gift purchase → recipient claim addressing (Issue #4)", () => {
  test.fixme(
    true,
    "Unblocked by P4.2 — thankYouPage schema gains gift-variant fields + /thank-you/[readingId] branches on searchParams.gift. Today: purchaser sees a thank-you addressed to the recipient (or vice versa).",
  );

  test("purchaser thank-you addresses purchaser, claim page addresses recipient", async ({
    page,
  }) => {
    await page.goto("/thank-you/fixture-gift-submission-id?gift=1&purchaserFirstName=Alice");
    const purchaserHeader = await page.getByRole("heading", { level: 1 }).textContent();
    expect(purchaserHeader, "purchaser thank-you greeting").toMatch(/Alice/);
    expect(purchaserHeader, "purchaser thank-you greeting").not.toMatch(/Bob/);

    await page.goto("/gift/claim/fixture-claim-token-bob");
    const claimHeader = await page.getByRole("heading", { level: 1 }).textContent();
    expect(claimHeader, "claim page greeting").toMatch(/Bob/);
    expect(claimHeader, "claim page greeting").not.toMatch(/Alice/);
  });
});

test.describe("Gift purchase final-page renders art6 + cooling-off unconditional (D-1a)", () => {
  test("art6 + cooling-off render on /gift/[slug], submit blocked when unchecked, succeeds when checked", async ({
    page,
  }) => {
    // Intercept Stripe Payment Link redirect — fixture readings carry placeholder
    // stripePaymentLink URLs that buy.stripe.com 404s on. Test the redirect
    // initiation, not Stripe's hosted checkout itself.
    await page.route(/buy\.stripe\.com/, (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<html>stripe</html>" }),
    );

    await page.goto("/book/birth-chart/gift");
    await page.getByLabel(/your first name/i).fill("Alice");
    await page.getByLabel(/your email/i).fill("alice@e2e.test");

    const art6Checkbox = page.getByRole("checkbox", {
      name: /processing my contact details/i,
    });
    const coolingOffCheckbox = page.getByRole("checkbox", {
      name: /14[- ]?day|cooling[- ]?off|non[- ]refund/i,
    });
    await expect(art6Checkbox).toBeVisible();
    await expect(coolingOffCheckbox).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: /art\.?\s*9|sensitive|special[- ]category/i }),
    ).toHaveCount(0);

    const submit = page.getByRole("button", { name: /send this gift/i });
    await submit.click();
    await expect(page.getByRole("alert").first()).toContainText(/acknowledg/i);

    await art6Checkbox.check();
    await coolingOffCheckbox.check();
    await submit.click();
    await page.waitForURL(/buy\.stripe\.com|stripe\.com/);
  });
});
