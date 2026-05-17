import { expect, test } from "@playwright/test";

import { seedIntakeDraft, waitForDraftRestore } from "../helpers/intakeDraft";

test.describe("Time-of-birth unknown toggle", () => {
  test("toggle disables the time input, lets submit proceed; absent toggle blocks submit", async ({
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

    let foundBirthPage = false;
    for (let i = 0; i < 10; i += 1) {
      const timeLabel = page.getByText(/I don't know my birth time/i).first();
      if (await timeLabel.count() > 0) {
        foundBirthPage = true;
        break;
      }
      const nextBtn = page.getByTestId("intake-next");
      if (await nextBtn.count() === 0) break;
      await nextBtn.click();
    }

    expect(foundBirthPage, "intake should expose the birth section before the final page").toBe(true);

    const toggle = page.getByLabel(/I don't know my birth time/i);
    await expect(toggle).toBeVisible();
    await expect(toggle).not.toBeChecked();

    const timeInput = page.locator("#field-time_of_birth");
    await expect(timeInput).toBeEnabled();

    await page.getByTestId("intake-next").click();
    await expect(
      page.getByText(/Please enter a time, or check/i).first(),
    ).toBeVisible();

    await toggle.check();
    await expect(toggle).toBeChecked();
    await expect(timeInput).toBeDisabled();

    await page.getByTestId("intake-next").click();
    await expect(
      page.getByText(/Please enter a time, or check/i),
    ).toHaveCount(0);
  });
});
