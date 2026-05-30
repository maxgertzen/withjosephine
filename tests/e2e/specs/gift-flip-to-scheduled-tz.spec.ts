import { expect, test } from "@playwright/test";

import { signInViaMagicLink } from "../helpers/auth";
import { resetCapturedState } from "../helpers/captureStore";
import { datetimeLocalPlus } from "../helpers/datetimeLocal";
import { resetE2EDatabase } from "../helpers/e2eReset";
import { interceptStripeCheckout } from "../helpers/stripeCheckout";
import { fireCheckoutCompleted } from "../helpers/stripeWebhook";
import { waitForTurnstileToken } from "../helpers/turnstile";

const READING_SLUG = "birth-chart";

test.beforeEach(async ({ request }) => {
  await resetCapturedState(request);
  await resetE2EDatabase(request);
});

test.describe("Flip-to-scheduled — TZ-aware client conversion (D-9) — mock mode", () => {
  test("captures browser IANA TZ, converts datetime-local to UTC ISO, surfaces tz in preview", async ({
    page,
    request,
  }) => {
    test.setTimeout(2 * 60 * 1000);

    const purchaserEmail = "flip-tz-purchaser@withjosephine.com";

    const intercept = await interceptStripeCheckout(page, {
      readingSlug: READING_SLUG,
      gift: true,
    });

    await page.goto(`/book/${READING_SLUG}/gift`);
    await page.locator(`input[name="deliveryMethod"][value="self_send"]`).check();
    await page.locator("#gift-purchaser-first-name").fill("FlipTzPurchaser");
    await page.locator("#gift-purchaser-email").fill(purchaserEmail);
    await page.locator("#gift-recipient-name").fill("FlipTzRecipient");
    await page.locator("#gift-message").fill("D-9 flip tz e2e walk.");
    await page.locator("#gift-art6-consent").check();
    await page.locator("#gift-cooling-off-consent").check();
    await waitForTurnstileToken(page);
    await page.getByRole("button", { name: /(send|schedule|gift)/i }).first().click();
    await page.waitForURL(/\/thank-you\//, { timeout: 30_000 });

    const { sessionId, submissionId } = await intercept.captured;

    const webhookResponse = await fireCheckoutCompleted(request, submissionId, {
      stripeSessionId: sessionId,
      customerEmail: purchaserEmail,
      amountTotal: 9900,
    });
    expect(webhookResponse.status()).toBe(200);

    await signInViaMagicLink(page, { email: purchaserEmail, next: "/my-readings" });

    const flipCta = page.getByRole("button", { name: /let josephine send it for me/i });
    await expect(flipCta).toBeVisible();
    await flipCta.click();

    const sendAtInput = page.locator("input[name='giftSendAt']");
    await expect(sendAtInput).toBeVisible();

    const recipientEmail = "flip-tz-recipient@withjosephine.com";
    const flipRecipientInput = page
      .locator("input[type='email']")
      .filter({ hasNot: page.locator("[disabled]") })
      .last();
    await flipRecipientInput.fill(recipientEmail);
    const localInput = await datetimeLocalPlus(page, 60);
    const [datePart, timePart] = localInput.split("T");
    const [yyyy, mo, dd] = datePart.split("-");
    await sendAtInput.fill(`${dd}/${mo}/${yyyy} ${timePart}`);

    const browserTz = await page.evaluate(
      () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
    expect(browserTz).toMatch(/^[A-Za-z]+\//);

    await expect(page.getByText(new RegExp(`\\(${browserTz.replace(/\//g, "\\/")}\\)`))).toBeVisible();

    let capturedBody: { recipientEmail?: string; giftSendAt?: string } | null = null;
    await page.route(`**/api/gifts/${submissionId}/flip-to-scheduled`, async (route) => {
      const body = route.request().postDataJSON() as typeof capturedBody;
      capturedBody = body;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ updated: true }),
      });
    });

    await page.getByRole("button", { name: /schedule it/i }).click();
    await expect.poll(() => capturedBody !== null, { timeout: 5_000 }).toBe(true);

    const sent = capturedBody as unknown as { recipientEmail?: string; giftSendAt?: string };
    expect(sent.recipientEmail).toBe(recipientEmail);
    const flipUtcIso = sent.giftSendAt ?? "";
    expect(flipUtcIso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

    const roundTripped = await page.evaluate(
      ({ utc, tz }) => {
        const d = new Date(utc);
        const parts = new Intl.DateTimeFormat("en-CA", {
          timeZone: tz,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
          .formatToParts(d)
          .reduce<Record<string, string>>((acc, part) => {
            acc[part.type] = part.value;
            return acc;
          }, {});
        return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
      },
      { utc: flipUtcIso, tz: browserTz },
    );
    expect(roundTripped).toBe(localInput);
  });

  test("edit-recipient send-at change captures browser TZ, converts to UTC ISO", async ({
    page,
    request,
  }) => {
    test.setTimeout(2 * 60 * 1000);

    const purchaserEmail = "edit-tz-purchaser@withjosephine.com";

    const intercept = await interceptStripeCheckout(page, {
      readingSlug: READING_SLUG,
      gift: true,
    });

    await page.goto(`/book/${READING_SLUG}/gift`);
    await page.locator(`input[name="deliveryMethod"][value="scheduled"]`).check();
    await page.locator("#gift-purchaser-first-name").fill("EditTzPurchaser");
    await page.locator("#gift-purchaser-email").fill(purchaserEmail);
    await page.locator("#gift-recipient-name").fill("EditTzRecipient");
    await page
      .locator("#gift-recipient-email")
      .fill("edit-tz-recipient-original@withjosephine.com");
    const initialSendAt = await datetimeLocalPlus(page, 60 * 24); // ~24h out
    await page.locator("#gift-send-at").fill(initialSendAt);
    await page.locator("#gift-message").fill("D-9 edit tz e2e walk.");
    await page.locator("#gift-art6-consent").check();
    await page.locator("#gift-cooling-off-consent").check();
    await waitForTurnstileToken(page);
    await page.getByRole("button", { name: /(send|schedule|gift)/i }).first().click();
    await page.waitForURL(/\/thank-you\//, { timeout: 30_000 });

    const { sessionId, submissionId } = await intercept.captured;
    const webhookResponse = await fireCheckoutCompleted(request, submissionId, {
      stripeSessionId: sessionId,
      customerEmail: purchaserEmail,
      amountTotal: 9900,
    });
    expect(webhookResponse.status()).toBe(200);

    await signInViaMagicLink(page, { email: purchaserEmail, next: "/my-readings" });

    const editCta = page.getByRole("button", { name: /edit recipient/i });
    await expect(editCta).toBeVisible();
    await editCta.click();

    const sendAtInput = page.locator("input[name='giftSendAt']");
    await expect(sendAtInput).toBeVisible();

    const newLocalInput = await datetimeLocalPlus(page, 60 * 48);
    const [editDatePart, editTimePart] = newLocalInput.split("T");
    const [editYyyy, editMo, editDd] = editDatePart.split("-");
    await sendAtInput.fill(`${editDd}/${editMo}/${editYyyy} ${editTimePart}`);

    const browserTz = await page.evaluate(
      () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
    expect(browserTz).toMatch(/^[A-Za-z]+\//);
    await expect(
      page.getByText(new RegExp(`\\(${browserTz.replace(/\//g, "\\/")}\\)`)),
    ).toBeVisible();

    let capturedBody: { recipientEmail?: string; giftSendAt?: string | null } | null = null;
    await page.route(
      `**/api/gifts/${submissionId}/edit-recipient`,
      async (route) => {
        capturedBody = route.request().postDataJSON() as typeof capturedBody;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ updated: true }),
        });
      },
    );

    await page.getByRole("button", { name: /save changes/i }).click();
    await expect.poll(() => capturedBody !== null, { timeout: 5_000 }).toBe(true);

    const sent = capturedBody as unknown as { recipientEmail?: string; giftSendAt?: string | null };
    expect(sent.recipientEmail).toBeUndefined();
    const editUtcIso = typeof sent.giftSendAt === "string" ? sent.giftSendAt : "";
    expect(editUtcIso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

    const roundTripped = await page.evaluate(
      ({ utc, tz }) => {
        const d = new Date(utc);
        const parts = new Intl.DateTimeFormat("en-CA", {
          timeZone: tz,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
          .formatToParts(d)
          .reduce<Record<string, string>>((acc, part) => {
            acc[part.type] = part.value;
            return acc;
          }, {});
        return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
      },
      { utc: editUtcIso, tz: browserTz },
    );
    expect(roundTripped).toBe(newLocalInput);
  });
});
