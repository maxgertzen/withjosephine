import { expect, type Page, test } from "@playwright/test";

import { GIFT_DEFAULTS } from "@/data/defaults";
import { giftPath } from "@/lib/gift/giftCodeFormat";

import {
  recordGiftLimiterCall,
  spendGiftLimiterCall,
  waitForEmptyGiftLimiterWindow,
} from "../helpers/giftLimiterBudget";

const MALFORMED_GIFT_PATH = giftPath("x");
const LOOKUPS_ALLOWED_PER_MINUTE = 5;
const BURST_PERIOD_LEFT_MS = 40_000;
const RECOVERY_TIMEOUT_MS = 90_000;
const RECOVERY_POLL_MS = 5_000;

async function openMalformedGift(page: Page): Promise<string> {
  const response = await page.goto(MALFORMED_GIFT_PATH);
  expect(response?.status()).toBe(200);
  const notFound = page.getByRole("heading", { name: GIFT_DEFAULTS.notFoundHeading });
  const rateLimited = page.getByRole("heading", { name: GIFT_DEFAULTS.rateLimitedHeading });
  await expect(notFound.or(rateLimited)).toBeVisible();
  return (await notFound.isVisible())
    ? GIFT_DEFAULTS.notFoundHeading
    : GIFT_DEFAULTS.rateLimitedHeading;
}

test.describe("Gift code limiter, mock mode", () => {
  test("the sixth lookup in a minute shows the rate-limited page until the minute passes", async ({
    page,
  }) => {
    test.setTimeout(4 * 60_000);
    await waitForEmptyGiftLimiterWindow({ minimumPeriodLeftMs: BURST_PERIOD_LEFT_MS });

    for (let lookup = 0; lookup < LOOKUPS_ALLOWED_PER_MINUTE; lookup++) {
      expect(await spendGiftLimiterCall(() => openMalformedGift(page))).toBe(
        GIFT_DEFAULTS.notFoundHeading,
      );
    }

    recordGiftLimiterCall();
    expect(await openMalformedGift(page)).toBe(GIFT_DEFAULTS.rateLimitedHeading);
    await expect(page.getByText(GIFT_DEFAULTS.rateLimitedBody)).toBeVisible();

    await expect
      .poll(
        async () => {
          recordGiftLimiterCall();
          return openMalformedGift(page);
        },
        { timeout: RECOVERY_TIMEOUT_MS, intervals: [RECOVERY_POLL_MS] },
      )
      .toBe(GIFT_DEFAULTS.notFoundHeading);
  });
});
