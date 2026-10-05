import { randomUUID } from "node:crypto";

import { expect, type Page, type Response, test } from "@playwright/test";

import { GIFT_DEFAULTS } from "@/data/defaults";
import { SANDBOX_DOMAIN, SANDBOX_EMAIL_PREFIXES } from "@/lib/booking/sandboxEmails";
import { giftPath, normalizeGiftCode } from "@/lib/gift/giftCodeFormat";
import { bookingPath, GIFT_PURCHASE_API_ROUTE } from "@/lib/http/routes";

import { GIFT_DISPLAY_CODE } from "../helpers/giftSeed";
import {
  acceptFinalPageConsents,
  clickThroughIntakePages,
  readIntakeDraft,
  seedIntakeDraft,
} from "../helpers/intakeDraft";
import { cleanupSandboxResidue } from "../helpers/sandboxResidueCleanup";
import { forceD1Mirror, uploadDummyVoiceAndPdf } from "../helpers/sanityE2EAssets";
import { escapeSqliteLiteral, queryStagingD1, sandboxRequestHeaders } from "../helpers/stagingApi";
import { fillStripeCheckout } from "../helpers/stripeCheckout";
import { stubTurnstile } from "../helpers/turnstileStub";

const READING_SLUG = "birth-chart";
const BUYER_FIRST_NAME = "Dana";
const RECIPIENT_FIRST_NAME = "Anna";
const RECIPIENT_THANK_YOU_URL = /\/thank-you\/birth-chart\?submissionId=/;
const D1_POLL = { timeout: 60_000, intervals: [2_000, 5_000] };

type GiftRow = { status: string; buyer_email_claimed_at: string | null };
type SubmissionRow = { status: string; gift_code_id: string | null };
type CountRow = { n: number };
type DeliveredRow = { delivered_at: string | null };
type BoughtGift = { giftId: string; code: string };

function sandboxEmail(runId: string, role: string): string {
  return `${SANDBOX_EMAIL_PREFIXES.giftRoundtrip}${runId}-${role}${SANDBOX_DOMAIN}`;
}

const PURCHASE_RESPONSE_TIMEOUT_MS = 30_000;

async function capturePurchaseResponse(page: Page): Promise<Promise<{ status: number; body: string }>> {
  let captured: (value: { status: number; body: string }) => void = () => {};
  const response = new Promise<{ status: number; body: string }>((resolve, reject) => {
    captured = resolve;
    setTimeout(() => reject(new Error("[gift-roundtrip] no POST to the gift purchase route")), PURCHASE_RESPONSE_TIMEOUT_MS);
  });
  await page.route(
    `**${GIFT_PURCHASE_API_ROUTE}`,
    async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      const fetched = await route.fetch();
      captured({ status: fetched.status(), body: await fetched.text() });
      await route.fulfill({ response: fetched });
    },
    { times: 1 },
  );
  return response;
}

async function buyGiftThroughGiftRow(page: Page, buyerEmail: string): Promise<BoughtGift> {
  await stubTurnstile(page);
  await page.goto(bookingPath(READING_SLUG));
  await page.getByRole("button", { name: GIFT_DEFAULTS.giftRowLabel }).click();
  await page.getByRole("button", { name: GIFT_DEFAULTS.buyLinkLabel }).click();
  const sheet = page.getByRole("dialog").filter({ hasText: GIFT_DEFAULTS.sheetEyebrow });
  await sheet.getByLabel(new RegExp(GIFT_DEFAULTS.buyerNameLabel)).fill(BUYER_FIRST_NAME);
  await sheet.getByRole("checkbox").check();

  const purchase = await capturePurchaseResponse(page);
  const thankYouDocument = page.waitForResponse(
    (response) =>
      response.url().includes("/thank-you/") && response.request().resourceType() === "document",
    { timeout: 90_000 },
  );
  await sheet.locator('button[type="submit"]').click();
  const purchaseResponse = await purchase;
  expect(purchaseResponse.status, purchaseResponse.body).toBe(200);
  const { giftId } = JSON.parse(purchaseResponse.body) as { giftId: string };
  await fillStripeCheckout(page, buyerEmail);

  const firstPaint = await (await thankYouDocument).text();
  const code = normalizeGiftCode(firstPaint.match(GIFT_DISPLAY_CODE)?.[0] ?? "");
  if (!code) {
    throw new Error("[gift-roundtrip] thank-you first paint has no gift code");
  }
  await expect(page.getByText(GIFT_DISPLAY_CODE)).toBeVisible();

  await expect
    .poll(
      async () =>
        (
          await queryStagingD1<GiftRow>(
            `SELECT status, buyer_email_claimed_at FROM gift_codes WHERE id = '${giftId}'`,
          )
        )[0],
      D1_POLL,
    )
    .toMatchObject({ status: "active", buyer_email_claimed_at: expect.any(String) });

  return { giftId, code };
}

async function openGiftOnLastPage(page: Page, code: string, recipientEmail: string): Promise<void> {
  await stubTurnstile(page);
  await seedIntakeDraft(page, READING_SLUG, {
    values: { email: recipientEmail, first_name: RECIPIENT_FIRST_NAME },
  });
  await page.goto(giftPath(code));
  await expect(page.getByText(GIFT_DEFAULTS.priceLine)).toBeVisible();
  await clickThroughIntakePages(page, 6);
  await acceptFinalPageConsents(page);
}

function bookingResponse(page: Page): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/booking") && response.request().method() === "POST",
    { timeout: 60_000 },
  );
}

test.use({ extraHTTPHeaders: sandboxRequestHeaders() });

test.describe("Gift sandbox round-trip, staging", () => {
  test.describe.configure({ mode: "serial" });

  let boughtGift: BoughtGift | null = null;
  let redeemedSubmissionId = "";
  let runId = "";

  test.beforeAll(async () => {
    runId = randomUUID().slice(0, 8);
    const { sanityDeleted } = await cleanupSandboxResidue({
      emailPrefix: SANDBOX_EMAIL_PREFIXES.giftRoundtrip,
    });
    console.log(
      `[gift-roundtrip] preflight wipe: D1 cleared + ${sanityDeleted} Sanity submission(s) deleted`,
    );
  });

  test("birth-chart: gift row → gift sheet → Stripe → thank-you shows the code", async ({ page }) => {
    test.setTimeout(4 * 60 * 1000);

    boughtGift = await buyGiftThroughGiftRow(page, sandboxEmail(runId, "buyer"));
  });

  test("redeem by link → recipient thank-you → paid submission", async ({ page }) => {
    test.setTimeout(4 * 60 * 1000);
    if (!boughtGift) {
      throw new Error("[gift-roundtrip] the purchase test must pass first");
    }
    const { giftId, code } = boughtGift;

    await openGiftOnLastPage(page, code, sandboxEmail(runId, "recipient"));
    await page.getByTestId("intake-submit").click();

    await page.waitForURL(RECIPIENT_THANK_YOU_URL, { timeout: 60_000 });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(RECIPIENT_FIRST_NAME);
    const submissionId = new URL(page.url()).searchParams.get("submissionId") ?? "";

    await expect
      .poll(
        async () =>
          (
            await queryStagingD1<SubmissionRow>(
              `SELECT status, gift_code_id FROM submissions WHERE id = '${escapeSqliteLiteral(submissionId)}'`,
            )
          )[0],
        D1_POLL,
      )
      .toMatchObject({ status: "paid", gift_code_id: giftId });
    redeemedSubmissionId = submissionId;
  });

  test("deliver the gift reading: assets in Sanity, forced mirror, D1 delivered_at set", async () => {
    test.setTimeout(2 * 60 * 1000);
    if (!redeemedSubmissionId) {
      throw new Error("[gift-roundtrip] the redeem test must pass first");
    }

    await uploadDummyVoiceAndPdf(redeemedSubmissionId);
    const mirror = await forceD1Mirror(redeemedSubmissionId);
    expect(mirror.submissionId).toBe(redeemedSubmissionId);
    expect(mirror.awaitingAssets, "force-mode should see Sanity assets").toBe(0);

    await expect
      .poll(
        async () =>
          (
            await queryStagingD1<DeliveredRow>(
              `SELECT delivered_at FROM submissions WHERE id = '${escapeSqliteLiteral(redeemedSubmissionId)}'`,
            )
          )[0]?.delivered_at ?? null,
        D1_POLL,
      )
      .not.toBeNull();
  });

  test("two browsers submit one gift: one thank-you, one 409 with answers kept", async ({
    browser,
    page,
  }) => {
    test.setTimeout(5 * 60 * 1000);
    const { giftId, code } = await buyGiftThroughGiftRow(page, sandboxEmail(runId, "race-buyer"));

    const otherContext = await browser.newContext({ extraHTTPHeaders: sandboxRequestHeaders() });
    const otherPage = await otherContext.newPage();
    const racers = [
      { page, email: sandboxEmail(runId, "race-first") },
      { page: otherPage, email: sandboxEmail(runId, "race-second") },
    ];
    for (const racer of racers) {
      await openGiftOnLastPage(racer.page, code, racer.email);
    }

    const pendingResponses = racers.map((racer) => bookingResponse(racer.page));
    await Promise.all(racers.map((racer) => racer.page.getByTestId("intake-submit").click()));
    const responses = await Promise.all(pendingResponses);
    const statuses = responses.map((response) => response.status());
    expect([...statuses].sort()).toEqual([200, 409]);

    const loserIndex = statuses.indexOf(409);
    const winner = racers[1 - loserIndex];
    const loser = racers[loserIndex];
    expect(await responses[loserIndex].json()).toEqual({ error: "gift_already_redeemed" });

    await winner.page.waitForURL(RECIPIENT_THANK_YOU_URL, { timeout: 60_000 });
    await expect(loser.page.getByText(GIFT_DEFAULTS.openedRaceError)).toBeVisible();
    await expect(loser.page.getByText(GIFT_DEFAULTS.priceLine)).toHaveCount(0);
    const loserDraft = await readIntakeDraft(loser.page, READING_SLUG);
    expect(loserDraft?.values.email).toBe(loser.email);
    expect(loserDraft?.giftCode).toBeUndefined();

    expect(
      await queryStagingD1<CountRow>(
        `SELECT COUNT(*) AS n FROM submissions WHERE gift_code_id = '${giftId}'`,
      ),
    ).toEqual([{ n: 1 }]);

    await otherContext.close();
  });
});
