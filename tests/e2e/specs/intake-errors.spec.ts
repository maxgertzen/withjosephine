import { expect, test } from "@playwright/test";

test.describe("Birth Chart Continue reachability + per-field errors (Issue #3)", () => {
  test("Continue with empty fields surfaces the offending field name AND scrolls to it", async ({
    page,
  }) => {
    await page.goto("/book/birth-chart/intake");

    const summary = page.getByRole("alert").filter({ hasText: /still need/i });
    await expect(summary).toBeVisible();

    const jumpButton = summary.getByRole("button");
    await expect(jumpButton).toBeVisible();
    await jumpButton.click();

    const firstError = page.locator("[aria-invalid='true']").first();
    await expect(firstError).toBeInViewport();
  });
});
