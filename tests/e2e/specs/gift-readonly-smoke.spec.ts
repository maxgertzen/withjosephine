import { expect, type Page, test } from "@playwright/test";

import { giftPath } from "@/lib/gift/giftCodeFormat";

const APEX_UNPARKED = process.env.APEX_UNPARKED === "true";

const UNKNOWN_GIFT_PATH = giftPath("AAAAAAAAAAAA");
const MALFORMED_GIFT_PATH = giftPath("x");
const GIFT_PATHS = [UNKNOWN_GIFT_PATH, MALFORMED_GIFT_PATH] as const;
const NOINDEX_META = /<meta name="robots" content="noindex/;

async function visibleMainText(page: Page, path: string): Promise<string> {
  const response = await page.goto(path);
  expect(response?.status(), `GET ${path} should return 200`).toBe(200);
  return page.getByRole("main").innerText();
}

test.describe("Prod read-only gift smoke", () => {
  test.skip(!APEX_UNPARKED, "Apex parked: smoke specs gated behind APEX_UNPARKED=true");

  test("an unknown code and a malformed code show the same page", async ({ page }) => {
    const unknown = await visibleMainText(page, UNKNOWN_GIFT_PATH);
    const malformed = await visibleMainText(page, MALFORMED_GIFT_PATH);

    expect(malformed).toBe(unknown);
  });

  for (const path of GIFT_PATHS) {
    test(`${path} is noindex, no-referrer and not cached`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(200);
      expect(await response.text()).toMatch(NOINDEX_META);
      expect(response.headers()["referrer-policy"]).toBe("no-referrer");
      expect(response.headers()["cache-control"]).toBe("private, no-store, max-age=0");
    });
  }
});
