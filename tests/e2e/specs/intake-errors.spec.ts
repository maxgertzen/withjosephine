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

  test("Bug #3: Next button is disabled when the page is invalid", async ({ page }) => {
    await page.goto("/book/birth-chart/intake");
    const nextButton = page.getByTestId("intake-next");
    await expect(nextButton).toBeVisible();
    await expect(nextButton).toBeDisabled();
  });
});
