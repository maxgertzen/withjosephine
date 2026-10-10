import { expect, test } from "@playwright/test";

test.describe("Birth Chart intake — validation surface", () => {
  test("Bug #2: no validation errors render on first paint", async ({ page }) => {
    await page.goto("/book/birth-chart");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("[aria-invalid='true']")).toHaveCount(0);
    await expect(
      page.getByRole("alert").filter({ hasText: /still need/i }),
    ).toHaveCount(0);
  });

  test("an invalid page keeps the advance button enabled and marks the missing fields on click", async ({
    page,
  }) => {
    await page.goto("/book/birth-chart");
    const advance = page
      .locator("[data-testid='intake-next'], [data-testid='intake-submit']")
      .first();
    await expect(advance).toBeEnabled();
    await advance.click();
    await expect(page.locator("[aria-invalid='true']").first()).toBeFocused();
    await expect(page).toHaveURL(/\/book\/birth-chart/);
  });
});
