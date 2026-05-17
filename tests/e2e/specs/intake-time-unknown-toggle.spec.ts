import { expect, test } from "@playwright/test";

import { seedIntakeDraft, waitForDraftRestore } from "../helpers/intakeDraft";

test.describe("Time-of-birth unknown toggle", () => {
  test("toggle is rendered and controls the time input's enabled state", async ({
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
      const toggle = page.getByLabel(/I don't know my birth time/i).first();
      if (await toggle.isVisible().catch(() => false)) break;
      const nextBtn = page.getByTestId("intake-next");
      if ((await nextBtn.count()) === 0 || (await nextBtn.isDisabled())) break;
      await nextBtn.click();
    }

    const toggle = page.getByLabel(/I don't know my birth time/i).first();
    await expect(toggle).toBeVisible();
    await expect(toggle).not.toBeChecked();

    const timeInput = page.locator("#field-time_of_birth");
    await expect(timeInput).toBeEnabled();

    await toggle.check();
    await expect(toggle).toBeChecked();
    await expect(timeInput).toBeDisabled();
  });
});
