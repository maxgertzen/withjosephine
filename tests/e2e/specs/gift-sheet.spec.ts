import { expect, type Page, test } from "@playwright/test";

import { GIFT_DEFAULTS } from "@/data/defaults";
import { CONSENT_ACK_MESSAGE } from "@/lib/compliance/intakeConsent";
import { applyTokens } from "@/lib/emails/applyTokens";
import { GIFT_PURCHASE_API_ROUTE } from "@/lib/http/routes";
import { giftPreviewPath } from "@/lib/page-previews/preview-fixtures-pages";

import { MOBILE_AND_DESKTOP } from "../helpers/viewports";

const BUY_SHEET_PREVIEW = giftPreviewPath("buy-sheet");
const SUBMIT_LABEL = "Continue to payment →";
const ROSE_CLASS = /text-j-text-rose/;

function counterText(remaining: number): string {
  return applyTokens(GIFT_DEFAULTS.noteCounterTemplate, { remaining });
}

async function openBuySheet(page: Page) {
  await page.goto(BUY_SHEET_PREVIEW);
  const sheet = page.getByRole("dialog").filter({ hasText: GIFT_DEFAULTS.sheetEyebrow });
  await expect(sheet).toBeVisible();
  return sheet;
}

for (const { name, viewport } of MOBILE_AND_DESKTOP) {
  test.describe(`Gift sheet preview, ${name}`, () => {
    test.use({ viewport });

    test("an empty submit shows the name and cooling-off errors and posts nothing", async ({ page }) => {
      const purchasePosts: string[] = [];
      page.on("request", (request) => {
        if (request.url().includes(GIFT_PURCHASE_API_ROUTE)) purchasePosts.push(request.url());
      });
      const sheet = await openBuySheet(page);

      await sheet.getByRole("button", { name: SUBMIT_LABEL }).click();

      await expect(sheet.getByText(GIFT_DEFAULTS.buyerNameRequired)).toBeVisible();
      await expect(sheet.getByText(CONSENT_ACK_MESSAGE)).toBeVisible();
      await expect(sheet.getByText(GIFT_DEFAULTS.buyerNameHelp)).toBeHidden();
      expect(purchasePosts).toEqual([]);
    });

    test("the note counter appears at 220 characters and turns rose at 260", async ({ page }) => {
      const sheet = await openBuySheet(page);
      const note = sheet.getByLabel(GIFT_DEFAULTS.noteLabel);

      await note.fill("a".repeat(219));
      await expect(sheet.getByText(counterText(61))).toBeHidden();

      await note.fill("a".repeat(220));
      await expect(sheet.getByText(counterText(60))).toBeVisible();

      await note.fill("a".repeat(259));
      await expect(sheet.getByText(counterText(21))).not.toHaveClass(ROSE_CLASS);

      await note.fill("a".repeat(260));
      await expect(sheet.getByText(counterText(20))).toHaveClass(ROSE_CLASS);
    });

    test("Escape closes the sheet", async ({ page }) => {
      const sheet = await openBuySheet(page);

      await page.keyboard.press("Escape");

      await expect(sheet).toBeHidden();
    });

    test("Not now closes the sheet", async ({ page }) => {
      const sheet = await openBuySheet(page);

      await sheet.getByRole("button", { name: GIFT_DEFAULTS.sheetCancelLabel }).click();

      await expect(sheet).toBeHidden();
    });
  });
}
