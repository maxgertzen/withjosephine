import { expect, type Locator, type Page, type Route, test } from "@playwright/test";

import { GIFT_DEFAULTS } from "@/data/defaults";
import {
  GIFT_CLIENT_REFERENCE_PREFIX,
  giftIdFromClientReferenceId,
} from "@/lib/gift/clientReference";
import { giftPath } from "@/lib/gift/giftCodeFormat";
import { bookingPath, GIFT_CHECK_API_ROUTE } from "@/lib/http/routes";

import { resetCapturedState } from "../helpers/captureStore";
import { resetE2EDatabase } from "../helpers/e2eReset";
import { spendGiftLimiterCall } from "../helpers/giftLimiterBudget";
import { GIFT_DISPLAY_CODE, registerGiftSession, seedPaidGift } from "../helpers/giftSeed";
import {
  acceptFinalPageConsents,
  clickThroughIntakePages,
  readIntakeDraft,
  seedIntakeDraft,
} from "../helpers/intakeDraft";
import { MOBILE_AND_DESKTOP } from "../helpers/viewports";

const READING_SLUG = "birth-chart";
const OTHER_READING_SLUG = "soul-blueprint";
const BUYER_EMAIL = "gift-book-entry-buyer@withjosephine.com";
const RECIPIENT_EMAIL = "gift-book-entry-recipient@withjosephine.com";
const UNKNOWN_CODE = "AAAA AAAA AAAA";
const STRIPE_BUY_GLOB = "https://buy.stripe.com/**";
const GIFT_CHECK_GLOB = `**${GIFT_CHECK_API_ROUTE}`;
const OTHER_READING_ERROR = new RegExp(
  `^${GIFT_DEFAULTS.codeOtherReadingTemplate.split("{reading}")[0]}`,
);

type HeldRequest = { release: () => void };

function giftRow(page: Page): Locator {
  return page.getByRole("button", { name: GIFT_DEFAULTS.giftRowLabel });
}

function redeemSheet(page: Page): Locator {
  return page.getByRole("dialog").filter({ hasText: GIFT_DEFAULTS.redeemHeading });
}

function lastPageCodeField(page: Page): Locator {
  return page.getByLabel(GIFT_DEFAULTS.codeFieldOptionalLabel);
}

async function openBookingPage(page: Page): Promise<void> {
  await page.goto(bookingPath(READING_SLUG));
  await expect(page.getByTestId("gift-fold")).toBeVisible();
}

async function openGiftRow(page: Page): Promise<void> {
  await giftRow(page).click();
  await expect(giftRow(page)).toHaveAttribute("aria-expanded", "true");
}

async function openRedeemSheet(page: Page): Promise<Locator> {
  await openBookingPage(page);
  await openGiftRow(page);
  await page.getByRole("button", { name: GIFT_DEFAULTS.redeemLinkLabel }).click();
  const sheet = redeemSheet(page);
  await expect(sheet).toBeVisible();
  return sheet;
}

async function redeemInSheet(sheet: Locator, code: string): Promise<void> {
  await sheet.getByLabel(GIFT_DEFAULTS.codeFieldLabel, { exact: true }).fill(code);
  await spendGiftLimiterCall(() =>
    sheet.getByRole("button", { name: GIFT_DEFAULTS.redeemButtonLabel }).click(),
  );
}

async function openLastPage(page: Page): Promise<void> {
  await seedIntakeDraft(page, READING_SLUG);
  await page.goto(bookingPath(READING_SLUG));
  await clickThroughIntakePages(page, 6);
  await acceptFinalPageConsents(page);
  await expect(lastPageCodeField(page)).toBeVisible();
}

async function submitLastPage(page: Page): Promise<void> {
  await spendGiftLimiterCall(() => page.getByTestId("intake-submit").click());
}

async function holdGiftChecks(page: Page): Promise<HeldRequest> {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(GIFT_CHECK_GLOB, async (route: Route) => {
    await gate;
    await route.continue();
  });
  return { release };
}

async function markDocument(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __beforeRedeem?: boolean }).__beforeRedeem = true;
  });
}

async function documentWasReplaced(page: Page): Promise<boolean> {
  return page.evaluate(
    () => (window as unknown as { __beforeRedeem?: boolean }).__beforeRedeem === undefined,
  );
}

test.beforeEach(async ({ request }) => {
  await resetCapturedState(request);
  await resetE2EDatabase(request);
});

for (const { name, viewport } of MOBILE_AND_DESKTOP) {
  test.describe(`Gift entry on /book, ${name}`, () => {
    test.use({ viewport });

    test("the gift row opens to the buy line and the redeem line", async ({ page }) => {
      await openBookingPage(page);
      await expect(giftRow(page)).toHaveAttribute("aria-expanded", "false");

      await openGiftRow(page);

      await expect(page.getByText(GIFT_DEFAULTS.buyLead)).toBeVisible();
      await expect(page.getByRole("button", { name: GIFT_DEFAULTS.buyLinkLabel })).toBeVisible();
      await expect(page.getByText(GIFT_DEFAULTS.redeemLead)).toBeVisible();
      await expect(page.getByRole("button", { name: GIFT_DEFAULTS.redeemLinkLabel })).toBeVisible();
    });

    test("the gift sheet goes to the Payment Link and the thank-you page shows the code", async ({
      page,
      baseURL,
    }) => {
      test.setTimeout(2 * 60_000);
      const clientReferenceIds: string[] = [];
      await page.route(STRIPE_BUY_GLOB, async (route) => {
        const clientReferenceId =
          new URL(route.request().url()).searchParams.get("client_reference_id") ?? "";
        clientReferenceIds.push(clientReferenceId);
        const giftId = giftIdFromClientReferenceId(clientReferenceId);
        if (!giftId) {
          await route.abort();
          return;
        }
        const sessionId = await registerGiftSession(page.request, giftId, {
          paymentStatus: "paid",
          buyerEmail: BUYER_EMAIL,
        });
        await route.fulfill({
          status: 303,
          headers: { location: `${baseURL}/thank-you/${READING_SLUG}?sessionId=${sessionId}` },
        });
      });

      await openBookingPage(page);
      await openGiftRow(page);
      await page.getByRole("button", { name: GIFT_DEFAULTS.buyLinkLabel }).click();
      const sheet = page.getByRole("dialog").filter({ hasText: GIFT_DEFAULTS.sheetEyebrow });
      await expect(sheet).toBeVisible();
      await sheet.getByLabel(new RegExp(GIFT_DEFAULTS.buyerNameLabel)).fill("Dana");
      await sheet.getByRole("checkbox").check();
      await sheet.locator('button[type="submit"]').click();

      await page.waitForURL(`${baseURL}/thank-you/${READING_SLUG}?sessionId=*`, {
        timeout: 30_000,
      });
      expect(clientReferenceIds).toEqual([
        expect.stringMatching(new RegExp(`^${GIFT_CLIENT_REFERENCE_PREFIX}.+`)),
      ]);
      await expect(page.getByText(GIFT_DISPLAY_CODE)).toBeVisible();
    });

    test("the redeem sheet rejects a wrong code", async ({ page }) => {
      const sheet = await openRedeemSheet(page);

      await redeemInSheet(sheet, UNKNOWN_CODE);

      await expect(sheet.getByText(GIFT_DEFAULTS.codeNotFound)).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`${bookingPath(READING_SLUG)}$`));
    });

    test("the redeem sheet points a code for another reading to that reading", async ({
      page,
      request,
    }) => {
      const gift = await seedPaidGift(request, {
        readingSlug: OTHER_READING_SLUG,
        buyerEmail: BUYER_EMAIL,
      });
      const sheet = await openRedeemSheet(page);

      await redeemInSheet(sheet, gift.code);

      await expect(sheet.getByText(OTHER_READING_ERROR)).toBeVisible();
      await expect(
        sheet.getByRole("button", {
          name: new RegExp(`^${GIFT_DEFAULTS.goToReadingTemplate.split("{reading}")[0]}`),
        }),
      ).toBeVisible();
    });

    test("a valid code in the redeem sheet loads /gift/<code> with the draft kept", async ({
      page,
      request,
    }) => {
      test.setTimeout(2 * 60_000);
      const gift = await seedPaidGift(request, {
        readingSlug: READING_SLUG,
        buyerEmail: BUYER_EMAIL,
      });
      await openBookingPage(page);
      await page.locator("#field-email").fill(RECIPIENT_EMAIL);
      await expect
        .poll(() => readIntakeDraft(page, READING_SLUG))
        .toMatchObject({ values: { email: RECIPIENT_EMAIL } });
      await markDocument(page);

      await openGiftRow(page);
      await page.getByRole("button", { name: GIFT_DEFAULTS.redeemLinkLabel }).click();
      await spendGiftLimiterCall(async () => {
        await redeemInSheet(redeemSheet(page), gift.code);
        await page.waitForURL(new RegExp(`${giftPath(gift.code)}$`), { timeout: 30_000 });
      });

      expect(await documentWasReplaced(page)).toBe(true);
      await expect(page.getByText(GIFT_DEFAULTS.priceLine)).toBeVisible();
      await expect(page.locator("#field-email")).toHaveValue(RECIPIENT_EMAIL);
      await expect(page.getByTestId("gift-fold")).toHaveCount(0);
    });

    test("a rate-limited check shows the too many tries error", async ({ page }) => {
      await page.route(GIFT_CHECK_GLOB, (route) =>
        route.fulfill({ status: 429, json: { result: "rate_limited" } }),
      );
      const sheet = await openRedeemSheet(page);

      await sheet.getByLabel(GIFT_DEFAULTS.codeFieldLabel, { exact: true }).fill(UNKNOWN_CODE);
      await sheet.getByRole("button", { name: GIFT_DEFAULTS.redeemButtonLabel }).click();

      await expect(sheet.getByText(GIFT_DEFAULTS.codeTooManyTries)).toBeVisible();
    });

    test("the last-page code field checks only on the submit press", async ({ page }) => {
      test.setTimeout(2 * 60_000);
      const checks: string[] = [];
      page.on("request", (request) => {
        if (request.url().includes(GIFT_CHECK_API_ROUTE)) checks.push(request.url());
      });
      await openLastPage(page);
      await expect(lastPageCodeField(page)).toHaveValue("");

      await lastPageCodeField(page).fill(UNKNOWN_CODE);
      await lastPageCodeField(page).blur();
      expect(checks).toEqual([]);

      const held = await holdGiftChecks(page);
      await submitLastPage(page);
      await expect(page.getByText(GIFT_DEFAULTS.codeChecking)).toBeVisible();
      held.release();

      await expect(page.getByText(GIFT_DEFAULTS.codeNotFound)).toBeVisible();
      expect(checks).toHaveLength(1);
      await expect(page).toHaveURL(new RegExp(`${bookingPath(READING_SLUG)}$`));
    });

    test("the last-page code field rejects a code for another reading", async ({
      page,
      request,
    }) => {
      test.setTimeout(2 * 60_000);
      const gift = await seedPaidGift(request, {
        readingSlug: OTHER_READING_SLUG,
        buyerEmail: BUYER_EMAIL,
      });
      await openLastPage(page);

      await lastPageCodeField(page).fill(gift.code);
      await submitLastPage(page);

      await expect(page.getByText(OTHER_READING_ERROR)).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`${bookingPath(READING_SLUG)}$`));
    });

    test("the last-page code field accepts a code and opens the gift form", async ({
      page,
      request,
    }) => {
      test.setTimeout(2 * 60_000);
      const gift = await seedPaidGift(request, {
        readingSlug: READING_SLUG,
        buyerEmail: BUYER_EMAIL,
      });
      await openLastPage(page);

      await lastPageCodeField(page).fill(gift.code);
      await spendGiftLimiterCall(async () => {
        await submitLastPage(page);
        await page.waitForURL(new RegExp(`${giftPath(gift.code)}$`), { timeout: 30_000 });
      });

      await expect(page.getByText(GIFT_DEFAULTS.priceLine)).toBeVisible();
      await expect(page.getByTestId("gift-fold")).toHaveCount(0);
    });
  });
}
