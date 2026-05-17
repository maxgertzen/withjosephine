import { expect, test } from "@playwright/test";

import { seedIntakeDraft, waitForDraftRestore } from "../helpers/intakeDraft";

test.describe("Time-of-birth unknown toggle", () => {
  test("toggle controls the time input and re-enables submit when checked", async ({
    page,
  }) => {
    await seedIntakeDraft(page, "birth-chart", {
      values: {
        time_of_birth: "",
        time_of_birth_unknown: false,
      },
    });
    await page.goto("/book/birth-chart/intake");
    await waitForDraftRestore(page);

    for (let i = 0; i < 10; i += 1) {
      const toggleCount = await page.getByLabel(/I don't know my birth time/i).count();
      if (toggleCount > 0) break;
      const nextBtn = page.getByTestId("intake-next");
      if (await nextBtn.count() === 0 || (await nextBtn.isDisabled())) break;
      await nextBtn.click();
    }

    const toggle = page.getByLabel(/I don't know my birth time/i);
    await expect(toggle).toBeVisible();
    await expect(toggle).not.toBeChecked();

    const timeInput = page.locator("#field-time_of_birth");
    await expect(timeInput).toBeEnabled();

    const nextBtn = page.getByTestId("intake-next");
    await expect(nextBtn).toBeDisabled();

    await toggle.check();
    await expect(toggle).toBeChecked();
    await expect(timeInput).toBeDisabled();
    await expect(nextBtn).toBeEnabled();
  });
});
