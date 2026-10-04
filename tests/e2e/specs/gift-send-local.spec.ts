import { type APIRequestContext, expect, type Page, test } from "@playwright/test";

import { GIFT_DEFAULTS } from "@/data/defaults";
import { applyTokens } from "@/lib/emails/applyTokens";
import { formatGiftCode, giftPath } from "@/lib/gift/giftCodeFormat";

import { capturedEmailsTo, resetCapturedState, waitForEmailTo } from "../helpers/captureStore";
import { resetE2EDatabase } from "../helpers/e2eReset";
import { spendGiftLimiterCall } from "../helpers/giftLimiterBudget";
import { type SeededGift, seedPaidGift } from "../helpers/giftSeed";
import { stubTurnstile } from "../helpers/turnstileStub";
import { MOBILE_AND_DESKTOP } from "../helpers/viewports";

const READING_SLUG = "birth-chart";
const BUYER_EMAIL = "gift-send-buyer@withjosephine.com";
const RECIPIENT_NAME = "Anna";
const RECIPIENT_EMAIL = "gift-send-recipient@withjosephine.com";
const CORRECTED_RECIPIENT_EMAIL = "gift-send-recipient-corrected@withjosephine.com";
const MALFORMED_RECIPIENT_EMAIL = "anna@emailcom";

const SEND_COPY = {
  ...GIFT_DEFAULTS,
  alreadySentBodyPrefixTemplate: GIFT_DEFAULTS.alreadySentBodyTemplate.split("{date}")[0],
};

const SENT_HEADING = applyTokens(SEND_COPY.sentHeadingTemplate, { recipientName: RECIPIENT_NAME });
const ONE_LEFT_LABEL = applyTokens(SEND_COPY.resendLinkTemplate, { count: 1 });
const ALREADY_SENT_BODY_PREFIX = applyTokens(SEND_COPY.alreadySentBodyPrefixTemplate, {
  recipientName: RECIPIENT_NAME,
});

function thankYouPath(sessionId: string): string {
  return `/thank-you/${READING_SLUG}?sessionId=${sessionId}`;
}

function sentBody(recipientEmail: string): string {
  return applyTokens(SEND_COPY.sentBodyTemplate, { recipientEmail });
}

function withChangedMac(sendUrl: string): string {
  const [path, token] = sendUrl.split("#");
  const [giftId, mac] = token.split(".");
  const changedFirstChar = mac.startsWith("A") ? "B" : "A";
  return `${path}#${giftId}.${changedFirstChar}${mac.slice(1)}`;
}

async function openSendLink(page: Page, sendUrl: string): Promise<void> {
  await page.goto("about:blank");
  await page.goto(sendUrl);
}

function heading(page: Page, name: string | RegExp) {
  return page.getByRole("heading", { name, exact: true });
}

async function fillAndSend(page: Page, recipientEmail: string): Promise<void> {
  await page
    .getByRole("textbox", { name: SEND_COPY.recipientNameLabel, exact: true })
    .fill(RECIPIENT_NAME);
  await page
    .getByRole("textbox", { name: SEND_COPY.recipientEmailLabel, exact: true })
    .fill(recipientEmail);
  await page.getByRole("button", { name: SEND_COPY.sendButtonLabel, exact: true }).click();
}

async function expectRecipientEmailCarriesGift(
  request: APIRequestContext,
  recipientEmail: string,
  gift: SeededGift,
): Promise<void> {
  const { html = "" } = await waitForEmailTo(request, recipientEmail);
  expect(html).toContain(formatGiftCode(gift.code));
  expect(html).toContain(giftPath(gift.code));
}

test.beforeEach(async ({ page, request }) => {
  await resetCapturedState(request);
  await resetE2EDatabase(request);
  await stubTurnstile(page);
});

for (const { name, viewport } of MOBILE_AND_DESKTOP) {
  test.describe(`Gift send, ${name}`, () => {
    test.use({ viewport });

    test("the send link sends once, resends once, then shows sent twice", async ({
      page,
      request,
    }) => {
      test.setTimeout(2 * 60_000);
      const gift = await seedPaidGift(request, {
        readingSlug: READING_SLUG,
        buyerEmail: BUYER_EMAIL,
      });

      await openSendLink(page, gift.sendUrl);
      await expect(heading(page, SEND_COPY.sendHeading)).toBeVisible();
      expect(page.url()).not.toContain("#");
      expect(new URL(page.url()).pathname).toBe("/gift/send");

      await fillAndSend(page, RECIPIENT_EMAIL);
      await expect(heading(page, SENT_HEADING)).toBeVisible();
      await expect(page.getByText(sentBody(RECIPIENT_EMAIL), { exact: true })).toBeVisible();
      await expectRecipientEmailCarriesGift(request, RECIPIENT_EMAIL, gift);

      await openSendLink(page, gift.sendUrl);
      await expect(heading(page, SEND_COPY.alreadySentHeading)).toBeVisible();
      await expect(page.getByText(ALREADY_SENT_BODY_PREFIX)).toBeVisible();
      const resend = page.getByRole("button", { name: ONE_LEFT_LABEL, exact: true });
      await expect(resend).toBeVisible();

      await resend.click();
      await expect(
        page.getByRole("textbox", { name: SEND_COPY.recipientNameLabel, exact: true }),
      ).toHaveValue(RECIPIENT_NAME);
      await expect(
        page.getByRole("textbox", { name: SEND_COPY.recipientEmailLabel, exact: true }),
      ).toHaveValue("");
      await fillAndSend(page, CORRECTED_RECIPIENT_EMAIL);
      await expectRecipientEmailCarriesGift(request, CORRECTED_RECIPIENT_EMAIL, gift);

      await openSendLink(page, gift.sendUrl);
      await expect(heading(page, SEND_COPY.resendUsedHeading)).toBeVisible();
      await expect(page.getByRole("button", { name: SEND_COPY.sendButtonLabel })).toHaveCount(0);
      expect(await capturedEmailsTo(request, RECIPIENT_EMAIL)).toHaveLength(1);
      expect(await capturedEmailsTo(request, CORRECTED_RECIPIENT_EMAIL)).toHaveLength(1);
    });

    test("a malformed address and the buyer's own address show their errors and send nothing", async ({
      page,
      request,
    }) => {
      const gift = await seedPaidGift(request, {
        readingSlug: READING_SLUG,
        buyerEmail: BUYER_EMAIL,
      });
      await openSendLink(page, gift.sendUrl);
      await expect(heading(page, SEND_COPY.sendHeading)).toBeVisible();

      await fillAndSend(page, MALFORMED_RECIPIENT_EMAIL);
      await expect(page.getByText(SEND_COPY.recipientEmailInvalid, { exact: true })).toBeVisible();

      await fillAndSend(page, BUYER_EMAIL);
      await expect(page.getByText(SEND_COPY.recipientEmailIsBuyer, { exact: true })).toBeVisible();

      await expect(heading(page, SENT_HEADING)).toHaveCount(0);
      expect(await capturedEmailsTo(request, MALFORMED_RECIPIENT_EMAIL)).toHaveLength(0);
      expect(await capturedEmailsTo(request, BUYER_EMAIL)).toHaveLength(1);
    });

    test("the thank-you page form sends, and the send link then shows already sent", async ({
      page,
      request,
    }) => {
      const gift = await seedPaidGift(request, {
        readingSlug: READING_SLUG,
        buyerEmail: BUYER_EMAIL,
      });
      const response = await page.goto(thankYouPath(gift.sessionId));
      expect(response?.status()).toBe(200);

      await page.getByRole("button", { name: SEND_COPY.sendOpenLabel, exact: true }).click();
      await expect(heading(page, SEND_COPY.sendHeading)).toBeVisible();

      await fillAndSend(page, RECIPIENT_EMAIL);
      await expect(heading(page, SENT_HEADING)).toBeVisible();
      await expect(page.getByText(sentBody(RECIPIENT_EMAIL), { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: ONE_LEFT_LABEL, exact: true })).toBeVisible();
      await expectRecipientEmailCarriesGift(request, RECIPIENT_EMAIL, gift);

      await openSendLink(page, gift.sendUrl);
      await expect(heading(page, SEND_COPY.alreadySentHeading)).toBeVisible();
      await expect(page.getByRole("button", { name: ONE_LEFT_LABEL, exact: true })).toBeVisible();
    });

    test("a send link with a changed token shows the link does not work", async ({
      page,
      request,
    }) => {
      const gift = await seedPaidGift(request, {
        readingSlug: READING_SLUG,
        buyerEmail: BUYER_EMAIL,
      });

      await spendGiftLimiterCall(() => openSendLink(page, withChangedMac(gift.sendUrl)));

      await expect(heading(page, SEND_COPY.sendLinkInvalidHeading)).toBeVisible();
      expect(page.url()).not.toContain("#");
      await expect(
        page.getByRole("textbox", { name: SEND_COPY.recipientEmailLabel, exact: true }),
      ).toHaveCount(0);
    });
  });
}
