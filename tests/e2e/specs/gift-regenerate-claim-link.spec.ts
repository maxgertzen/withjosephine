import { expect, test } from "@playwright/test";

import { getCapturedEmails, resetCapturedState } from "../helpers/captureStore";
import { interceptStripeCheckout } from "../helpers/stripeCheckout";
import { fireCheckoutCompleted } from "../helpers/stripeWebhook";
import { waitForTurnstileToken } from "../helpers/turnstile";

const READING_SLUG = "birth-chart";
const CLAIM_TOKEN_RE = /\/gift\/claim\?token=([A-Za-z0-9_-]+)/;

test.beforeEach(async ({ request }) => {
  await resetCapturedState(request);
  await request.post("/api/e2e-reset").catch(() => undefined);
});

test.describe("Admin regenerate-gift-claim — token rotation + cooldown — mock mode", () => {
  test("regenerates token, old URL routes to invalid surface, new URL resolves, cooldown blocks immediate re-issue", async ({
    page,
    request,
  }) => {
    test.setTimeout(2 * 60 * 1000);

    const purchaserEmail = "regen-purchaser@withjosephine.com";
    const recipientEmail = "regen-recipient@withjosephine.com";

    const intercept = await interceptStripeCheckout(page, {
      readingSlug: READING_SLUG,
      gift: true,
    });

    await page.goto(`/book/${READING_SLUG}/gift`);
    await page.locator(`input[name="deliveryMethod"][value="self_send"]`).check();
    await page.locator("#gift-purchaser-first-name").fill("RegenPurchaser");
    await page.locator("#gift-purchaser-email").fill(purchaserEmail);
    await page.locator("#gift-recipient-name").fill("RegenRecipient");
    await page.locator("#gift-message").fill("Regenerate claim-link e2e walk.");
    await page.locator("#gift-art6-consent").check();
    await page.locator("#gift-cooling-off-consent").check();
    await waitForTurnstileToken(page);
    await page.getByRole("button", { name: /(send|schedule|gift)/i }).first().click();
    await page.waitForURL(/\/thank-you\//, { timeout: 30_000 });

    const { sessionId, submissionId } = await intercept.captured;

    // Webhook issues the initial claim token for self-send gifts; captured
    // email's HTML carries the URL.
    const webhookResponse = await fireCheckoutCompleted(request, submissionId, {
      stripeSessionId: sessionId,
      customerEmail: purchaserEmail,
      amountTotal: 9900,
    });
    expect(webhookResponse.status()).toBe(200);

    const initialEmails = await getCapturedEmails(request);
    const initialWithClaimUrl = initialEmails.find(
      (e) => e.html && CLAIM_TOKEN_RE.test(e.html),
    );
    expect(
      initialWithClaimUrl,
      "initial gift_purchase_confirmation email carries claim URL in html",
    ).toBeTruthy();
    const oldToken = CLAIM_TOKEN_RE.exec(initialWithClaimUrl!.html!)![1];

    const regenRes = await request.post(`/api/admin/regenerate-gift-claim`, {
      headers: {
        "content-type": "application/json",
        "x-admin-token": process.env.ADMIN_API_KEY ?? "e2e_admin_api_key_dummy",
      },
      data: { submissionId },
    });
    expect(regenRes.status()).toBe(200);
    const regenBody = (await regenRes.json()) as {
      outcome: string;
      to: string;
      deliveryMethod: string;
    };
    expect(regenBody.outcome).toBe("regenerated");
    expect(regenBody.deliveryMethod).toBe("self_send");
    expect(regenBody.to).toMatch(/\*+/);
    expect(regenBody.to).not.toContain(recipientEmail);

    const afterRegenEmails = await getCapturedEmails(request);
    const claimUrlEmails = afterRegenEmails.filter(
      (e) => e.html && CLAIM_TOKEN_RE.test(e.html),
    );
    expect(claimUrlEmails.length).toBeGreaterThanOrEqual(2);
    const newClaimEmail = claimUrlEmails[claimUrlEmails.length - 1];
    const newToken = CLAIM_TOKEN_RE.exec(newClaimEmail.html!)![1];
    expect(newToken).not.toBe(oldToken);

    // Old token now invalid — page redirects through /api/gift/claim and
    // lands on /gift/claim?invalid=1 (alreadyClaimed VellumShell copy).
    await page.goto(`/gift/claim?token=${encodeURIComponent(oldToken)}`);
    await expect(page).toHaveURL(/\/gift\/claim\?invalid=1/, { timeout: 10_000 });
    await expect(page.getByRole("heading").first()).toBeVisible();

    // New token routes through to /gift/intake (recipient is now signed in
    // via the claim cookie set by the API route).
    await page.context().clearCookies();
    await page.goto(`/gift/claim?token=${encodeURIComponent(newToken)}`);
    await expect(page).toHaveURL(/\/gift\/intake/, { timeout: 10_000 });

    // Immediate re-issue is refused by the 5-minute cooldown gate.
    const secondRegenRes = await request.post(`/api/admin/regenerate-gift-claim`, {
      headers: {
        "content-type": "application/json",
        "x-admin-token": process.env.ADMIN_API_KEY ?? "e2e_admin_api_key_dummy",
      },
      data: { submissionId },
    });
    expect(secondRegenRes.status()).toBe(409);
    const secondBody = (await secondRegenRes.json()) as {
      outcome: string;
      reason: string;
    };
    expect(secondBody.outcome).toBe("refused");
    expect(secondBody.reason).toBe("cooldown");

    // Wrong admin token → 404 (silent — same shape as missing-token /
    // unconfigured-key, per authorizeAdminToken).
    const unauthRes = await request.post(`/api/admin/regenerate-gift-claim`, {
      headers: {
        "content-type": "application/json",
        "x-admin-token": "definitely-wrong-token",
      },
      data: { submissionId },
    });
    expect(unauthRes.status()).toBe(404);
  });
});
