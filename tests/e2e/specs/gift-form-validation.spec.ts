import { expect, test } from "@playwright/test";

test.describe("Gift form — Send button gating (bug #6)", () => {
  test("Send button is disabled on first paint with empty form", async ({ page }) => {
    await page.goto("/book/birth-chart/gift");
    const submit = page.getByRole("button", { name: /send this gift/i });
    await expect(submit).toBeVisible();
    await expect(submit).toBeDisabled();
  });

  test("Send button stays disabled until ALL required fields + consents are satisfied", async ({
    page,
  }) => {
    await page.goto("/book/birth-chart/gift");
    const submit = page.getByRole("button", { name: /send this gift/i });
    await expect(submit).toBeDisabled();

    await page.fill("#gift-purchaser-first-name", "Maya");
    await expect(submit).toBeDisabled();

    await page.fill("#gift-purchaser-email", "maya@example.com");
    await expect(submit).toBeDisabled();

    await page.fill("#gift-recipient-name", "River");
    await expect(submit).toBeDisabled();

    await page.check("#gift-art6-consent");
    await expect(submit).toBeDisabled();

    await page.check("#gift-cooling-off-consent");
    await expect(submit).toBeEnabled();
  });
});
