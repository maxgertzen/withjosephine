import { expect, test } from "@playwright/test";

test.describe("Birth Chart Continue reachability + per-field errors (Issue #3)", () => {
  test.fixme(
    true,
    "Unblocked by P3.4 — `<PageValidationSummary />` replaces the 'Please complete the required fields above' dead-end banner. Plus P3.1-P3.2: per-field errors derived on render via useIntakeSchema(). Today: clicking Continue with empty fields shows the banner but no field-level indication of WHICH field is offending.",
  );

  test("Continue with empty fields surfaces the offending field name AND scrolls to it", async ({
    page,
  }) => {
    await page.goto("/book/birth-chart/intake");

    const next = page.getByRole("button", { name: /next|continue/i }).last();
    await next.click();

    const summary = page.getByRole("status").or(page.getByRole("alert"));
    await expect(summary).toBeVisible();
    await expect(summary).toContainText(/first name|email|date of birth|place of birth/i);

    const firstError = page.locator("[aria-invalid='true']").first();
    await expect(firstError).toBeInViewport();
  });
});
