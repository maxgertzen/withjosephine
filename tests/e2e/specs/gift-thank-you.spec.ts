import { expect, type Page, test } from "@playwright/test";

import { GIFT_DEFAULTS } from "@/data/defaults";
import { CLARITY_MASK_PROPS } from "@/lib/clarity";
import { applyTokens } from "@/lib/emails/applyTokens";
import { formatGiftCode } from "@/lib/gift/giftCodeFormat";

import { resetCapturedState } from "../helpers/captureStore";
import { resetE2EDatabase } from "../helpers/e2eReset";
import {
  GIFT_DISPLAY_CODE,
  purchaseGift,
  registerGiftSession,
  SEEDED_BUYER_FIRST_NAME,
  seedPaidGift,
} from "../helpers/giftSeed";
import { MOBILE_AND_DESKTOP } from "../helpers/viewports";

const READING_SLUG = "birth-chart";
const BUYER_EMAIL = "gift-thank-you@withjosephine.com";
const SEEDED_NOTE = "Happy birthday, Anna.";
const EDITED_NOTE = "Happy birthday, Anna. Enjoy it.";
const SHARE_TEXT = applyTokens(GIFT_DEFAULTS.shareMessageTemplate, {
  buyerName: SEEDED_BUYER_FIRST_NAME,
});
const CLARITY_MASK_VALUE = CLARITY_MASK_PROPS["data-clarity-mask"];

type ShareCall = { text?: string; url?: string };
type ShareRecorder = { __shareCalls: ShareCall[] };

function thankYouPath(sessionId: string): string {
  return `/thank-you/${READING_SLUG}?sessionId=${sessionId}`;
}

async function openThankYou(page: Page, sessionId: string): Promise<string> {
  const response = await page.goto(thankYouPath(sessionId));
  expect(response?.status()).toBe(200);
  return (await response?.text()) ?? "";
}

async function removeNavigatorShare(page: Page): Promise<void> {
  await page.addInitScript(() => {
    delete (Navigator.prototype as { share?: unknown }).share;
  });
}

async function stubNavigatorShare(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const recorder = window as unknown as ShareRecorder;
    recorder.__shareCalls = [];
    Object.defineProperty(Navigator.prototype, "share", {
      configurable: true,
      value: async (data: ShareCall) => {
        recorder.__shareCalls.push(data);
      },
    });
  });
}

test.beforeEach(async ({ request }) => {
  await resetCapturedState(request);
  await resetE2EDatabase(request);
});

for (const { name, viewport } of MOBILE_AND_DESKTOP) {
  test.describe(`Gift thank-you, ${name}`, () => {
    test.use({ viewport });

    test("a paid gift shows the code on first paint, masked for Clarity", async ({ page, request }) => {
      const gift = await seedPaidGift(request, { readingSlug: READING_SLUG, buyerEmail: BUYER_EMAIL });
      const displayCode = formatGiftCode(gift.code);

      const firstPaint = await openThankYou(page, gift.sessionId);

      expect(firstPaint).toContain(displayCode);
      await expect(page.getByText(displayCode, { exact: true })).toHaveAttribute(
        "data-clarity-mask",
        CLARITY_MASK_VALUE,
      );
    });

    test("a paid session shows the code before the webhook arrives", async ({ page, request }) => {
      const { giftId } = await purchaseGift(request, READING_SLUG);
      const sessionId = await registerGiftSession(request, giftId, {
        paymentStatus: "paid",
        buyerEmail: BUYER_EMAIL,
      });

      const firstPaint = await openThankYou(page, sessionId);

      expect(firstPaint).toMatch(GIFT_DISPLAY_CODE);
      await expect(page.getByRole("button", { name: GIFT_DEFAULTS.copyLinkLabel })).toBeVisible();
    });

    test("Copy link puts the gift URL on the clipboard", async ({ context, page, request }) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      const gift = await seedPaidGift(request, { readingSlug: READING_SLUG, buyerEmail: BUYER_EMAIL });
      await openThankYou(page, gift.sessionId);

      await page.getByRole("button", { name: GIFT_DEFAULTS.copyLinkLabel }).click();

      await expect(page.getByRole("button", { name: GIFT_DEFAULTS.linkCopiedLabel })).toBeVisible();
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      expect(new URL(copied).pathname).toBe(gift.giftUrl);
    });

    test("Share is hidden in a browser without navigator.share", async ({ page, request }) => {
      await removeNavigatorShare(page);
      const gift = await seedPaidGift(request, { readingSlug: READING_SLUG, buyerEmail: BUYER_EMAIL });
      await openThankYou(page, gift.sessionId);

      await expect(page.getByRole("button", { name: GIFT_DEFAULTS.copyLinkLabel })).toBeVisible();
      await expect(page.getByRole("button", { name: GIFT_DEFAULTS.shareLabel })).toHaveCount(0);
    });

    test("Share calls navigator.share with the message and the gift URL", async ({ page, request }) => {
      await stubNavigatorShare(page);
      const gift = await seedPaidGift(request, { readingSlug: READING_SLUG, buyerEmail: BUYER_EMAIL });
      await openThankYou(page, gift.sessionId);

      await page.getByRole("button", { name: GIFT_DEFAULTS.shareLabel }).click();

      const calls = await page.evaluate(() => (window as unknown as ShareRecorder).__shareCalls);
      expect(calls).toHaveLength(1);
      expect(calls[0].text).toBe(SHARE_TEXT);
      expect(new URL(calls[0].url ?? "").pathname).toBe(gift.giftUrl);
    });

    test("Edit note then Save note shows the saved callout and the new note", async ({ page, request }) => {
      const gift = await seedPaidGift(request, {
        readingSlug: READING_SLUG,
        buyerEmail: BUYER_EMAIL,
        note: SEEDED_NOTE,
      });
      await openThankYou(page, gift.sessionId);
      await expect(page.getByText(SEEDED_NOTE, { exact: true })).toHaveAttribute(
        "data-clarity-mask",
        CLARITY_MASK_VALUE,
      );

      await page.getByRole("button", { name: GIFT_DEFAULTS.editNoteLabel }).click();
      await expect(page.getByLabel(GIFT_DEFAULTS.fromLabel)).toHaveValue(SEEDED_BUYER_FIRST_NAME);
      const note = page.getByLabel(GIFT_DEFAULTS.noteLabel);
      await expect(note).toHaveValue(SEEDED_NOTE);
      await note.fill(EDITED_NOTE);
      await page.getByRole("button", { name: GIFT_DEFAULTS.saveNoteLabel }).click();

      await expect(page.getByText(GIFT_DEFAULTS.noteSavedNotice)).toBeVisible();
      await expect(page.getByText(EDITED_NOTE, { exact: true })).toBeVisible();
    });

    test("an unpaid session shows the bank line and no code", async ({ page, request }) => {
      const { giftId } = await purchaseGift(request, READING_SLUG);
      const sessionId = await registerGiftSession(request, giftId, {
        paymentStatus: "unpaid",
        buyerEmail: BUYER_EMAIL,
      });

      const firstPaint = await openThankYou(page, sessionId);

      await expect(page.getByText(GIFT_DEFAULTS.pendingBody)).toBeVisible();
      expect(firstPaint).not.toMatch(GIFT_DISPLAY_CODE);
      await expect(page.getByText(GIFT_DISPLAY_CODE)).toHaveCount(0);
      await expect(page.getByRole("button", { name: GIFT_DEFAULTS.copyLinkLabel })).toHaveCount(0);
    });
  });
}
