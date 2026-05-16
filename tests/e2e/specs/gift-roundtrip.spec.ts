// Watchable end-to-end gift round-trip against staging. Env-gated by
// E2E_GIFT_ROUNDTRIP=1; ignored by the default chromium project. Drives
// the gift purchase + recipient claim flow Becky used to validate manually.
//
// Stages:
//   1. Purchaser fills /book/birth-chart/gift (scheduled delivery)
//   2. Stripe sandbox checkout with 4242 card
//   3. Redirect to /thank-you/<id>?gift=1 — assert purchaser-mode rendering
//   4. POST /api/internal/gift-claim-regenerate → fresh claimUrl (the
//      endpoint returns the URL on the 200 success branch so this spec
//      doesn't have to parse a Resend dry-run email)
//   5. New context, no cookies, navigate claimUrl → /gift/intake
//   6. Recipient submits intake with all 3 consents → /thank-you/<id>?gift=1&redeemed=1
//
// Run: `set -a && source .env.staging && set +a && DO_DISPATCH_SECRET=<value> E2E_GIFT_ROUNDTRIP=1 pnpm exec playwright test --reporter=line`
import { expect, type Page, test } from "@playwright/test";

import { seedGiftIntakeDraft } from "../helpers/giftDraft";
import {
  clickThroughIntakePages,
  waitForDraftRestore,
} from "../helpers/intakeDraft";
import { regenerateGiftClaim } from "../helpers/stagingApi";

const accessClientId = process.env.CF_ACCESS_CLIENT_ID;
const accessClientSecret = process.env.CF_ACCESS_CLIENT_SECRET;
const dispatchSecret = process.env.DO_DISPATCH_SECRET;
const stripeTestEmail =
  process.env.STRIPE_ROUNDTRIP_EMAIL ?? "gift-roundtrip-stripe@withjosephine.com";

test.skip(
  process.env.E2E_GIFT_ROUNDTRIP !== "1",
  "Gift round-trip spec is opt-in. Set E2E_GIFT_ROUNDTRIP=1.",
);

test.skip(
  !accessClientId || !accessClientSecret,
  "CF Access service-token env vars missing. Source www/.env.staging first.",
);

test.skip(
  !dispatchSecret,
  "DO_DISPATCH_SECRET missing — set the same value used by the staging worker secret.",
);

test.use({
  extraHTTPHeaders: {
    "CF-Access-Client-Id": accessClientId ?? "",
    "CF-Access-Client-Secret": accessClientSecret ?? "",
  },
});

async function fillStripeCheckout(page: Page): Promise<void> {
  await page.waitForURL(/checkout\.stripe\.com|buy\.stripe\.com/, {
    timeout: 30_000,
  });
  await page.locator('input[name="email"]').first().fill(stripeTestEmail);
  await page.locator('input[name="cardNumber"]').fill("4242 4242 4242 4242");
  await page.locator('input[name="cardExpiry"]').fill("12 / 34");
  await page.locator('input[name="cardCvc"]').fill("123");
  const zip = page.locator('input[name="billingPostalCode"]');
  if (await zip.count()) await zip.fill("12345");
  const cardName = page.locator('input[name="billingName"]');
  if (await cardName.count()) await cardName.fill("Ada Lovelace");
  await page.getByTestId("hosted-payment-submit-button").click();
}

async function datetimeLocalPlus(page: Page, minutes: number): Promise<string> {
  // `datetime-local` expects YYYY-MM-DDTHH:mm in the BROWSER's local zone,
  // not UTC. Evaluating in-browser is the only reliable way to land in the
  // future across CI/local timezone variance.
  return page.evaluate((m) => {
    const t = new Date(Date.now() + m * 60_000);
    const pad = (n: number): string => String(n).padStart(2, "0");
    return (
      `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}` +
      `T${pad(t.getHours())}:${pad(t.getMinutes())}`
    );
  }, minutes);
}

test.describe("Gift round-trip — staging", () => {
  test("birth-chart: purchaser → Stripe → claim URL → recipient intake → redeem", async ({
    page,
    request,
    context,
  }) => {
    test.setTimeout(5 * 60 * 1000);

    const runId = crypto.randomUUID().slice(0, 8);
    const purchaserFirstName = `Roundtrip${runId}`;
    const purchaserEmail = `gift-roundtrip-purchaser+${runId}@withjosephine.com`;
    const recipientFirstName = `Recipient${runId}`;
    const recipientEmail = `gift-roundtrip-recipient+${runId}@withjosephine.com`;
    const giftMessage = `Automated round-trip ${runId}.`;
    // Compute giftSendAt AFTER first navigation so we can evaluate in the
    // browser's local timezone (datetime-local input is timezone-naive).
    let giftSendAt = "";

    // --- Purchaser leg ----------------------------------------------------
    await page.goto("/book/birth-chart/gift");
    await expect(
      page.getByRole("heading", { level: 1, name: /birth chart/i }),
    ).toBeVisible();

    giftSendAt = await datetimeLocalPlus(page, 60);

    // Scheduled delivery is mandatory — self-send is out of scope (the
    // recipient leg of the spec requires a recipientEmail on the submission).
    await page.locator('input[name="deliveryMethod"][value="scheduled"]').check();

    await page.locator("#gift-purchaser-first-name").fill(purchaserFirstName);
    await page.locator("#gift-purchaser-email").fill(purchaserEmail);
    await page.locator("#gift-recipient-name").fill(recipientFirstName);
    await page.locator("#gift-recipient-email").fill(recipientEmail);
    await page.locator("#gift-message").fill(giftMessage);
    await page.locator("#gift-send-at").fill(giftSendAt);

    // Purchaser surface — 2 hardcoded consents (art6 + cooling-off).
    // art9 is captured at the recipient redeem leg, not here.
    await page.locator("#gift-art6-consent").check();
    await page.locator("#gift-cooling-off-consent").check();

    await page
      .getByRole("button", { name: /(send|schedule|gift)/i })
      .first()
      .click();

    await fillStripeCheckout(page);

    await page.waitForURL(/\/thank-you\//, { timeout: 90_000 });
    const stripeRedirectUrl = page.url();
    const submissionIdMatch = stripeRedirectUrl.match(/\/thank-you\/([^?]+)/);
    expect(
      submissionIdMatch,
      `submissionId not found in ${stripeRedirectUrl}`,
    ).not.toBeNull();
    const submissionId = submissionIdMatch![1];

    // Smoke check the canonical gift-purchaser thank-you surface — Becky
    // bug #4 fixed the purchaser first-name slot rendering when the URL
    // carries `?gift=1&purchaserFirstName=`. The query-param override fills
    // the slot independent of the submission lookup, so this assertion
    // doesn't race the Stripe webhook.
    await page.goto(
      `/thank-you/${submissionId}?gift=1&purchaserFirstName=${encodeURIComponent(purchaserFirstName)}`,
      { waitUntil: "domcontentloaded" },
    );
    await expect(
      page.getByRole("heading", { level: 1 }).first(),
    ).toContainText(purchaserFirstName, { timeout: 10_000 });

    // --- Token retrieval via the auth-gated regenerate endpoint ----------
    // The regenerate endpoint internally polls until the submission is in
    // the lookup path. 404 transitions to 200 once the Stripe webhook has
    // mirrored into D1 + Sanity.
    const regenerated = await regenerateGiftClaim(
      request,
      submissionId,
      dispatchSecret!,
    );
    expect(regenerated.outcome).toBe("regenerated");
    expect(regenerated.deliveryMethod).toBe("scheduled");
    expect(regenerated.claimUrl).toMatch(/\/gift\/claim\?token=[0-9a-f]{64}$/);

    // Resolve to a same-origin URL so the existing extraHTTPHeaders attach.
    const claimPath = new URL(regenerated.claimUrl).pathname + new URL(regenerated.claimUrl).search;

    // --- Recipient leg ---------------------------------------------------
    // Clear cookies so the purchaser session doesn't leak.
    await context.clearCookies();

    // Seed the recipient intake draft BEFORE navigating. The form keys its
    // localStorage under `gift-redeem.<submissionId>` in redeem mode.
    await seedGiftIntakeDraft(page, submissionId, { recipientEmail });

    await page.goto(claimPath);

    // /gift/claim sets the claim cookie and 303s to /gift/intake?welcome=1.
    // Playwright follows it automatically.
    await page.waitForURL(/\/gift\/intake/, { timeout: 30_000 });

    // Recipient-facing greeting visible (Becky bug #5 closure).
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await waitForDraftRestore(page);
    await clickThroughIntakePages(page, 6);

    // Recipient surface — all 3 consents required.
    await page.locator("#field-art6-consent").check();
    await page.locator("#field-art9-consent").check();
    await page.locator("#field-cooling-off-consent").check();

    await page.getByTestId("intake-submit").click();

    await page.waitForURL(/\/thank-you\/.*[?&]gift=1[^"]*redeemed=1/, {
      timeout: 60_000,
    });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
