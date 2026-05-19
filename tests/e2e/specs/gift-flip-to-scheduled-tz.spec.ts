import { expect, test } from "@playwright/test";

import { resetCapturedState } from "../helpers/captureStore";
import { datetimeLocalPlus } from "../helpers/datetimeLocal";
import { fireCheckoutCompleted } from "../helpers/stripeWebhook";
import { waitForTurnstileToken } from "../helpers/turnstile";

const READING_SLUG = "birth-chart";

test.beforeEach(async ({ request }) => {
  await resetCapturedState(request);
  await request.post("/api/e2e-reset").catch(() => undefined);
});

test.describe("Flip-to-scheduled — TZ-aware client conversion (D-9) — mock mode", () => {
  test("captures browser IANA TZ, converts datetime-local to UTC ISO, surfaces tz in preview", async ({
    page,
    request,
  }) => {
    test.setTimeout(2 * 60 * 1000);

    const purchaserEmail = "flip-tz-purchaser@withjosephine.com";

    let interceptedSessionId: string | null = null;
    let interceptedSubmissionId: string | null = null;

    await page.route("https://buy.stripe.com/**", async (route) => {
      const url = new URL(route.request().url());
      const submissionId = url.searchParams.get("client_reference_id") ?? "";
      const sessionId = `cs_test_${crypto.randomUUID().slice(0, 8)}`;
      interceptedSessionId = sessionId;
      interceptedSubmissionId = submissionId;
      await route.fulfill({
        status: 303,
        headers: {
          location: `/thank-you/${READING_SLUG}?gift=1&sessionId=${sessionId}&submission=${submissionId}`,
        },
      });
    });

    // Book a self_send gift — no recipient_email or send_at at booking time;
    // those come at flip time.
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

    expect(interceptedSubmissionId).not.toBeNull();
    expect(interceptedSessionId).not.toBeNull();

    // Mark submission paid + persisted via the Stripe webhook.
    const webhookResponse = await fireCheckoutCompleted(request, interceptedSubmissionId!, {
      stripeSessionId: interceptedSessionId!,
      customerEmail: purchaserEmail,
      amountTotal: 9900,
    });
    expect(webhookResponse.status()).toBe(200);

    // Authenticate to /my-gifts via magic link.
    const issueResponse = await page.context().request.post(
      "/api/internal/issue-magic-link",
      {
        data: { email: purchaserEmail },
        headers: {
          "content-type": "application/json",
          "x-admin-token": process.env.ADMIN_API_KEY ?? "e2e_admin_api_key_dummy",
        },
      },
    );
    expect(issueResponse.status()).toBe(200);
    const { token } = (await issueResponse.json()) as { token: string };

    await page.goto(`/auth/verify?token=${token}&next=/my-gifts`);
    await page.locator("input[name='email']").fill(purchaserEmail);
    await page.locator("button[type='submit']").click();
    await page.waitForURL(/\/my-gifts/, { timeout: 15_000 });

    // Self-send card should be visible with the "Let Josephine send it for me" flip CTA.
    const flipCta = page.getByRole("button", { name: /let josephine send it for me/i });
    await expect(flipCta).toBeVisible();
    await flipCta.click();

    // Drawer opens with a recipient_email + datetime-local input.
    const sendAtInput = page.locator("input[type='datetime-local']");
    await expect(sendAtInput).toBeVisible();

    // Fill recipient email + datetime-local 60 mins from now (in browser TZ).
    const recipientEmail = "flip-tz-recipient@withjosephine.com";
    const flipRecipientInput = page
      .locator("input[type='email']")
      .filter({ hasNot: page.locator("[disabled]") })
      .last();
    await flipRecipientInput.fill(recipientEmail);
    const localInput = await datetimeLocalPlus(page, 60);
    await sendAtInput.fill(localInput);

    // Read the browser's resolved IANA timezone for cross-checking.
    const browserTz = await page.evaluate(
      () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
    expect(browserTz).toMatch(/^[A-Za-z]+\//); // IANA shape; Playwright Chromium reports a real region

    // ISC-18g — the live TimezonePreview should echo the IANA zone alongside
    // the formatted local time. The default template is "Arrives {date} ({tz}).".
    await expect(page.getByText(new RegExp(`\\(${browserTz.replace(/\//g, "\\/")}\\)`))).toBeVisible();

    // ISC-18b/c — intercept the flip POST and assert the payload carries a
    // UTC ISO derived from the local input + browser TZ (not a naive
    // `new Date(input).toISOString()`).
    let capturedBody: { recipientEmail?: string; giftSendAt?: string } | null = null;
    await page.route(`**/api/gifts/${interceptedSubmissionId}/flip-to-scheduled`, async (route) => {
      const body = route.request().postDataJSON() as typeof capturedBody;
      capturedBody = body;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ updated: true }),
      });
    });

    await page.getByRole("button", { name: /schedule it/i }).click();

    // Wait for the intercepted request to land.
    await expect.poll(() => capturedBody !== null, { timeout: 5_000 }).toBe(true);

    const sent = capturedBody as unknown as { recipientEmail?: string; giftSendAt?: string };
    expect(sent.recipientEmail).toBe(recipientEmail);
    expect(sent.giftSendAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

    // The UTC ISO, formatted back in the browser TZ, must match the original
    // datetime-local input (minute-level precision).
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
      { utc: sent.giftSendAt, tz: browserTz },
    );
    expect(roundTripped).toBe(localInput);
  });

  test("edit-recipient send-at change captures browser TZ, converts to UTC ISO", async ({
    page,
    request,
  }) => {
    test.setTimeout(2 * 60 * 1000);

    const purchaserEmail = "edit-tz-purchaser@withjosephine.com";

    let interceptedSessionId: string | null = null;
    let interceptedSubmissionId: string | null = null;

    await page.route("https://buy.stripe.com/**", async (route) => {
      const url = new URL(route.request().url());
      const submissionId = url.searchParams.get("client_reference_id") ?? "";
      const sessionId = `cs_test_${crypto.randomUUID().slice(0, 8)}`;
      interceptedSessionId = sessionId;
      interceptedSubmissionId = submissionId;
      await route.fulfill({
        status: 303,
        headers: {
          location: `/thank-you/${READING_SLUG}?gift=1&sessionId=${sessionId}&submission=${submissionId}`,
        },
      });
    });

    // Book a SCHEDULED gift so /my-gifts surfaces the edit-recipient CTA.
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

    expect(interceptedSubmissionId).not.toBeNull();
    const webhookResponse = await fireCheckoutCompleted(request, interceptedSubmissionId!, {
      stripeSessionId: interceptedSessionId!,
      customerEmail: purchaserEmail,
      amountTotal: 9900,
    });
    expect(webhookResponse.status()).toBe(200);

    const issueResponse = await page.context().request.post(
      "/api/internal/issue-magic-link",
      {
        data: { email: purchaserEmail },
        headers: {
          "content-type": "application/json",
          "x-admin-token": process.env.ADMIN_API_KEY ?? "e2e_admin_api_key_dummy",
        },
      },
    );
    expect(issueResponse.status()).toBe(200);
    const { token } = (await issueResponse.json()) as { token: string };

    await page.goto(`/auth/verify?token=${token}&next=/my-gifts`);
    await page.locator("input[name='email']").fill(purchaserEmail);
    await page.locator("button[type='submit']").click();
    await page.waitForURL(/\/my-gifts/, { timeout: 15_000 });

    // Open the edit-recipient drawer.
    const editCta = page.getByRole("button", { name: /edit recipient/i });
    await expect(editCta).toBeVisible();
    await editCta.click();

    const sendAtInput = page.locator("input[type='datetime-local']");
    await expect(sendAtInput).toBeVisible();

    // Change the send-at to a new local time (2 days out).
    const newLocalInput = await datetimeLocalPlus(page, 60 * 48);
    await sendAtInput.fill(newLocalInput);

    // The browser's TZ should be reflected in the live preview echo.
    const browserTz = await page.evaluate(
      () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
    expect(browserTz).toMatch(/^[A-Za-z]+\//);
    await expect(
      page.getByText(new RegExp(`\\(${browserTz.replace(/\//g, "\\/")}\\)`)),
    ).toBeVisible();

    // Intercept the edit POST and assert the TZ-converted body.
    let capturedBody: { recipientEmail?: string; giftSendAt?: string | null } | null = null;
    await page.route(
      `**/api/gifts/${interceptedSubmissionId}/edit-recipient`,
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
    // Only the changed field is sent — recipient_email + recipient_name are unchanged.
    expect(sent.recipientEmail).toBeUndefined();
    expect(sent.giftSendAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

    // Round-trip the UTC back through the browser TZ — must equal the new input.
    const roundTripped = await page.evaluate(
      ({ utc, tz }) => {
        const d = new Date(utc as string);
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
      { utc: sent.giftSendAt, tz: browserTz },
    );
    expect(roundTripped).toBe(newLocalInput);
  });
});
