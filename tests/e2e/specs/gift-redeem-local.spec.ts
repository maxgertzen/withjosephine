import { type APIRequestContext, expect, type Page, test } from "@playwright/test";

import {
  EMAIL_GIFT_OPENED_DEFAULTS,
  EMAIL_GIFT_RECIPIENT_CONFIRMATION_DEFAULTS,
  GIFT_DEFAULTS,
  READING_PAGE_DEFAULTS,
} from "@/data/defaults";
import { applyTokens } from "@/lib/emails/applyTokens";
import { giftPath } from "@/lib/gift/giftCodeFormat";

import {
  capturedEmailsTo,
  type CapturedMutationOp,
  flattenOps,
  getCapturedEmails,
  getCapturedMutations,
  resetCapturedState,
} from "../helpers/captureStore";
import { resetE2EDatabase } from "../helpers/e2eReset";
import { spendGiftLimiterCall } from "../helpers/giftLimiterBudget";
import { SEEDED_BUYER_FIRST_NAME, seedPaidGift } from "../helpers/giftSeed";
import {
  acceptFinalPageConsents,
  clickThroughIntakePages,
  readIntakeDraft,
  seedIntakeDraft,
} from "../helpers/intakeDraft";

const READING_SLUG = "birth-chart";
const BUYER_EMAIL = "gift-redeem-buyer@withjosephine.com";
const RECIPIENT_EMAIL = "gift-redeem-recipient@withjosephine.com";
const RECIPIENT_FIRST_NAME = "Anna";
const NOTE = "Happy birthday, Anna.";
const UNKNOWN_CODE = "AAAAAAAAAAAA";
const MALFORMED_CODE = "x";
const CAPTURE_TIMEOUT_MS = 10_000;

const NOTE_CARD_LABEL = applyTokens(GIFT_DEFAULTS.noteCardLabelTemplate, {
  buyerName: SEEDED_BUYER_FIRST_NAME,
});
const PAGE_LINE_GIFT_SEGMENT = applyTokens(GIFT_DEFAULTS.pageLineGiftTemplate, {
  buyerName: SEEDED_BUYER_FIRST_NAME,
});
const RECIPIENT_THANK_YOU_HEADING = applyTokens(GIFT_DEFAULTS.recipientThankYouHeadingTemplate, {
  recipientName: RECIPIENT_FIRST_NAME,
});
const RECIPIENT_THANK_YOU_CARD_LABEL = applyTokens(
  GIFT_DEFAULTS.recipientThankYouCardLabelTemplate,
  { buyerName: SEEDED_BUYER_FIRST_NAME },
);
const OPENED_SUBJECT = applyTokens(EMAIL_GIFT_OPENED_DEFAULTS.subjectTemplate, {
  recipientName: RECIPIENT_FIRST_NAME,
});
const JOSEPHINE_GIFT_SUBJECT_PART = `gift from ${SEEDED_BUYER_FIRST_NAME}`;

async function subjectsTo(request: APIRequestContext, address: string): Promise<string[]> {
  return (await capturedEmailsTo(request, address)).map((email) => email.subject);
}

async function josephineGiftNotificationCount(request: APIRequestContext): Promise<number> {
  return (await getCapturedEmails(request)).filter((email) =>
    email.subject.includes(JOSEPHINE_GIFT_SUBJECT_PART),
  ).length;
}

function targetsDoc(op: CapturedMutationOp, docId: string): boolean {
  if (op.kind !== "patch") return op.kind !== "delete" && op.doc._id === docId;
  const params = op.patch.params as { id?: string } | undefined;
  return op.id === docId || params?.id === docId;
}

async function capturedGiftDocWrites(
  request: APIRequestContext,
  giftId: string,
): Promise<CapturedMutationOp[]> {
  return flattenOps(await getCapturedMutations(request)).filter((op) => targetsDoc(op, giftId));
}

async function capturedGiftDocSets(
  request: APIRequestContext,
  giftId: string,
): Promise<Array<Record<string, unknown>>> {
  return (await capturedGiftDocWrites(request, giftId)).flatMap((op) =>
    op.kind === "patch" && op.patch.set ? [op.patch.set as Record<string, unknown>] : [],
  );
}

async function capturedPaidSet(
  request: APIRequestContext,
  giftId: string,
): Promise<Record<string, unknown> | null> {
  return (await capturedGiftDocSets(request, giftId)).find((set) => set.status === "paid") ?? null;
}

async function openGiftPage(page: Page, path: string): Promise<void> {
  const response = await spendGiftLimiterCall(() => page.goto(path));
  expect(response?.status()).toBe(200);
}

async function notFoundPageText(page: Page, code: string): Promise<string> {
  await openGiftPage(page, giftPath(code));
  await expect(page.getByRole("heading", { name: GIFT_DEFAULTS.notFoundHeading })).toBeVisible();
  return page.getByRole("main").innerText();
}

test.beforeEach(async ({ request }) => {
  await resetCapturedState(request);
  await resetE2EDatabase(request);
});

test.describe("Gift redeem, mock mode", () => {
  test("a paid gift opens in gift mode, redeems once, then shows already opened", async ({
    page,
    request,
  }) => {
    test.setTimeout(2 * 60_000);
    const gift = await seedPaidGift(request, {
      readingSlug: READING_SLUG,
      buyerEmail: BUYER_EMAIL,
      note: NOTE,
    });
    await seedIntakeDraft(page, READING_SLUG, {
      values: { email: RECIPIENT_EMAIL, first_name: RECIPIENT_FIRST_NAME },
    });

    await openGiftPage(page, gift.giftUrl);
    await expect(page.getByText(NOTE_CARD_LABEL)).toBeVisible();
    await expect(page.getByText(NOTE, { exact: true })).toBeVisible();
    await expect(page.getByText(GIFT_DEFAULTS.priceLine)).toBeVisible();
    await expect(page.locator("em", { hasText: `· ${PAGE_LINE_GIFT_SEGMENT}` })).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: READING_PAGE_DEFAULTS.otherReadingsTitle }),
    ).toHaveCount(0);

    await clickThroughIntakePages(page, 6);
    await acceptFinalPageConsents(page);
    const submit = page.getByTestId("intake-submit");
    await expect(submit).toContainText(GIFT_DEFAULTS.sendDetailsLabel);
    await spendGiftLimiterCall(() => submit.click());

    await page.waitForURL(/\/thank-you\/birth-chart\?submissionId=/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(RECIPIENT_THANK_YOU_HEADING);
    await expect(page.getByText(RECIPIENT_THANK_YOU_CARD_LABEL)).toBeVisible();

    await expect
      .poll(() => capturedPaidSet(request, gift.giftId), { timeout: CAPTURE_TIMEOUT_MS })
      .toMatchObject({
        status: "paid",
        paidAt: expect.any(String),
        gift: { buyerFirstName: SEEDED_BUYER_FIRST_NAME, openedAt: expect.any(String) },
      });
    expect(
      (await capturedGiftDocSets(request, gift.giftId)).map((set) => set.status),
    ).toEqual(expect.arrayContaining(["gift_waiting", "paid"]));
    const giftDocWrites = JSON.stringify(await capturedGiftDocWrites(request, gift.giftId));
    expect(giftDocWrites).not.toContain(gift.code.replaceAll("-", ""));
    expect(giftDocWrites).not.toContain(NOTE);
    expect(giftDocWrites).not.toContain(BUYER_EMAIL);

    await expect
      .poll(() => subjectsTo(request, RECIPIENT_EMAIL), { timeout: CAPTURE_TIMEOUT_MS })
      .toEqual([EMAIL_GIFT_RECIPIENT_CONFIRMATION_DEFAULTS.subject]);
    await expect
      .poll(
        async () =>
          (await subjectsTo(request, BUYER_EMAIL)).filter((subject) => subject === OPENED_SUBJECT),
        { timeout: CAPTURE_TIMEOUT_MS },
      )
      .toHaveLength(1);
    await expect
      .poll(() => josephineGiftNotificationCount(request), { timeout: CAPTURE_TIMEOUT_MS })
      .toBe(1);

    await openGiftPage(page, gift.giftUrl);
    await expect(
      page.getByRole("heading", { name: GIFT_DEFAULTS.alreadyOpenedHeading }),
    ).toBeVisible();
  });

  test("a malformed code and an unknown code render the same page", async ({ page }) => {
    const malformed = await notFoundPageText(page, MALFORMED_CODE);
    const unknown = await notFoundPageText(page, UNKNOWN_CODE);

    expect(unknown).toBe(malformed);
  });

  test("a reload keeps typed answers and shows the restored notice", async ({ page, request }) => {
    const gift = await seedPaidGift(request, { readingSlug: READING_SLUG, buyerEmail: BUYER_EMAIL });

    await openGiftPage(page, gift.giftUrl);
    await page.locator("#field-email").fill(RECIPIENT_EMAIL);
    await expect
      .poll(() => readIntakeDraft(page, READING_SLUG))
      .toMatchObject({ values: { email: RECIPIENT_EMAIL }, giftCode: gift.code });

    await spendGiftLimiterCall(() => page.reload());
    await expect(page.locator("#field-email")).toHaveValue(RECIPIENT_EMAIL);
    await expect(page.getByText(GIFT_DEFAULTS.draftRestoredNotice)).toBeVisible();
  });
});
