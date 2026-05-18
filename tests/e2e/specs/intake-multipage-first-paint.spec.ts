import { expect, test } from "@playwright/test";

import {
  seedIntakeDraft,
  waitForDraftRestore,
} from "../helpers/intakeDraft";

const PAGE_1_ONLY_VALID = {
  date_of_birth: "",
  time_of_birth: "",
  time_of_birth_unknown: false,
  place_of_birth: "",
  place_of_birth_geonameid: "",
  focus_questions: [] as string[],
  anything_else: "",
};

test.describe("Intake multi-page first paint — no validation carry-over (B-1)", () => {
  test("page 2 renders zero aria-invalid after advancing from a valid page 1", async ({
    page,
  }) => {
    await seedIntakeDraft(page, "soul-blueprint", {
      values: PAGE_1_ONLY_VALID,
    });
    await page.goto("/book/soul-blueprint/intake");
    await waitForDraftRestore(page);

    await expect(page.locator("[aria-invalid='true']")).toHaveCount(0);

    await page.getByTestId("intake-next").click();

    await expect(page.locator("[aria-invalid='true']")).toHaveCount(0);
  });

  test("returning to page 1 via Previous also clears any revealed errors", async ({
    page,
  }) => {
    await seedIntakeDraft(page, "soul-blueprint", {
      values: PAGE_1_ONLY_VALID,
    });
    await page.goto("/book/soul-blueprint/intake");
    await waitForDraftRestore(page);

    await page.getByTestId("intake-next").click();

    const backButton = page.getByRole("button", { name: /previous page/i });
    await expect(backButton).toBeVisible();
    await backButton.click();

    await expect(page.locator("[aria-invalid='true']")).toHaveCount(0);
  });
});
