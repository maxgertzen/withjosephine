import { expect, test } from "@playwright/test";

test.describe("Birth Chart intake — validation surface (bugs #2 #3)", () => {
  test("Bug #2: no validation errors render on first paint", async ({ page }) => {
    await page.goto("/book/birth-chart/intake");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("[aria-invalid='true']")).toHaveCount(0);
    await expect(
      page.getByRole("alert").filter({ hasText: /still need/i }),
    ).toHaveCount(0);
  });

  test("Bug #3: advance button is disabled when the page is invalid", async ({ page }) => {
    await page.goto("/book/birth-chart/intake");
    // Either Next (non-final page) or Continue to payment (final/single page) — whichever renders.
    const advance = page
      .locator("[data-testid='intake-next'], [data-testid='intake-submit']")
      .first();
    await expect(advance).toBeVisible();
    await expect(advance).toBeDisabled();
  });
});
