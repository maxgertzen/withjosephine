import { expect, test } from "@playwright/test";

import { READINGS_FOR_SMOKE as READINGS } from "../fixtures/readings";
import {
  clickThroughIntakePages,
  seedIntakeDraft,
} from "../helpers/intakeDraft";

test.describe("Intake page renders (smoke)", () => {
  for (const reading of READINGS) {
    test(`/book/${reading.slug}/intake renders without 500`, async ({ page }) => {
      const response = await page.goto(`/book/${reading.slug}/intake`);
      expect(response?.status(), `${reading.slug} should not 5xx`).toBeLessThan(500);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(/before we begin/i);
      const firstNameLabel = page
        .getByLabel(/first name/i)
        .first();
      await expect(firstNameLabel).toBeVisible();
    });
  }
});

test.describe("Booking happy-path with submit assertion", () => {
  for (const reading of READINGS) {
    test(`fills + submits ${reading.slug} → buy.stripe.com with client_reference_id`, async ({
      page,
    }) => {
      let stripeRedirectUrl: string | null = null;
      await page.route("https://buy.stripe.com/**", async (route) => {
        stripeRedirectUrl = route.request().url();
        await route.fulfill({
          status: 200,
          contentType: "text/html",
          body: "<html><body>mock stripe</body></html>",
        });
      });

      await seedIntakeDraft(page, reading.slug);
      await page.goto(`/book/${reading.slug}/intake`);

      await clickThroughIntakePages(page, 6);

      await page.locator("#field-art6-consent").check();
      await page.locator("#field-art9-consent").check();
      await page.locator("#field-cooling-off-consent").check();

      await page.getByTestId("intake-submit").click();
      await page.waitForURL(/buy\.stripe\.com/);

      expect(stripeRedirectUrl).not.toBeNull();
      expect(stripeRedirectUrl!).toMatch(/client_reference_id=/);
    });
  }
});

test.describe("Final-page acknowledgments without Sanity consentField (Issue #2)", () => {
  test("art6/art9/cooling-off render unconditional + block submit when unchecked", async ({
    page,
  }) => {
    await seedIntakeDraft(page, "birth-chart");
    await page.goto("/book/birth-chart/intake");

    await clickThroughIntakePages(page, 6);

    await expect(page.locator("#field-art6-consent")).toBeVisible();
    await expect(page.locator("#field-art9-consent")).toBeVisible();
    await expect(page.locator("#field-cooling-off-consent")).toBeVisible();

    await page.getByTestId("intake-submit").click();
    await expect(page.getByRole("alert").first()).toContainText(/acknowledg/i);
  });
});
