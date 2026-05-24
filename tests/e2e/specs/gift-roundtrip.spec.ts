import { expect, type Page, test } from "@playwright/test";

import { datetimeLocalPlus } from "../helpers/datetimeLocal";
import { seedGiftIntakeDraft } from "../helpers/giftDraft";
import {
  clickThroughIntakePages,
  waitForDraftRestore,
} from "../helpers/intakeDraft";
import { cleanupSandboxResidue } from "../helpers/sandboxResidueCleanup";
import {
  forceD1Mirror,
  uploadDummyVoiceAndPdf,
} from "../helpers/sanityE2EAssets";
import {
  findSubmissionIdByStripeSessionId,
  issueMagicLink,
  pollUntilPaid,
  regenerateGiftClaim,
  sandboxRequestHeaders,
} from "../helpers/stagingApi";
import { fillStripeCheckout } from "../helpers/stripeCheckout";
import { stubTurnstile } from "../helpers/turnstileStub";

const stripeTestEmail =
  process.env.STRIPE_ROUNDTRIP_EMAIL ?? "gift-roundtrip-stripe@withjosephine.com";

test.use({ extraHTTPHeaders: sandboxRequestHeaders() });


type GiftVariant = "scheduled" | "self_send";

async function drivePurchaserLeg(
  page: Page,
  variant: GiftVariant,
  args: {
    purchaserFirstName: string;
    purchaserEmail: string;
    recipientFirstName: string;
    recipientEmail: string;
    giftMessage: string;
  },
): Promise<{ stripeSessionId: string }> {
  await page.goto("/book/birth-chart/gift");
  await expect(
    page.getByRole("heading", { level: 1, name: /birth chart/i }),
  ).toBeVisible();

  await page
    .locator(`input[name="deliveryMethod"][value="${variant}"]`)
    .check();

  await page.locator("#gift-purchaser-first-name").fill(args.purchaserFirstName);
  await page.locator("#gift-purchaser-email").fill(args.purchaserEmail);
  await page.locator("#gift-recipient-name").fill(args.recipientFirstName);

  if (variant === "scheduled") {
    await page.locator("#gift-recipient-email").fill(args.recipientEmail);
    const sendAt = await datetimeLocalPlus(page, 60);
    await page.locator("#gift-send-at").fill(sendAt);
  }

  await page.locator("#gift-message").fill(args.giftMessage);
  await page.locator("#gift-art6-consent").check();
  await page.locator("#gift-cooling-off-consent").check();

  // Gift form is single-page, so the invisible Turnstile widget can still
  // be mid-execution when the test clicks submit. The form's submit handler
  // blocks with "Please complete the verification step" if the token isn't
  // populated yet. Wait for the widget's hidden response input to land.
  // Staging uses Cloudflare's always-pass test key (1x000…AA), so this
  // resolves in <1s in practice but we give it room.
  await page.waitForFunction(
    () => {
      const inputs = document.querySelectorAll(
        'input[name="cf-turnstile-response"]',
      );
      for (const input of inputs) {
        if ((input as HTMLInputElement).value.length > 0) return true;
      }
      return false;
    },
    { timeout: 15_000 },
  );

  await page
    .getByRole("button", { name: /(send|schedule|gift)/i })
    .first()
    .click();

  await fillStripeCheckout(page, stripeTestEmail);

  await page.waitForURL(/\/thank-you\//, { timeout: 90_000 });

  // Stripe Payment Link success_url is configured as
  // `/thank-you/<readingSlug>?sessionId={CHECKOUT_SESSION_ID}`.
  // Capture the sessionId BEFORE any further navigation overrides the URL.
  const redirectUrl = new URL(page.url());
  const stripeSessionId = redirectUrl.searchParams.get("sessionId");
  if (!stripeSessionId) {
    throw new Error(
      `Stripe redirect URL missing sessionId: ${redirectUrl.toString()}`,
    );
  }
  return { stripeSessionId };
}

test.describe("Gift round-trip — staging", () => {
  test.beforeAll(async () => {
    const { sanityDeleted } = await cleanupSandboxResidue({
      emailPrefix: "gift-roundtrip-purchaser+",
    });
    console.log(
      `[gift-roundtrip] preflight wipe: D1 cleared + ${sanityDeleted} Sanity submission(s) deleted`,
    );
  });

  test.beforeEach(async ({ page }) => {
    await stubTurnstile(page);
  });

  test("birth-chart scheduled: purchaser → Stripe → claim URL → recipient intake → redeem", async ({
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
    const giftMessage = `Automated scheduled round-trip ${runId}.`;

    const { stripeSessionId } = await drivePurchaserLeg(page, "scheduled", {
      purchaserFirstName,
      purchaserEmail,
      recipientFirstName,
      recipientEmail,
      giftMessage,
    });

    // Resolve the real submission id from Sanity. The URL path is the
    // reading slug, not the id. We key by sessionId (canonical Stripe data
    // mirrored to `stripeSessionId` on the submission doc).
    const submissionId =
      await findSubmissionIdByStripeSessionId(stripeSessionId);

    // Becky bug #4 closure — purchaser slot renders via query override.
    await page.goto(
      `/thank-you/birth-chart?gift=1&purchaserFirstName=${encodeURIComponent(purchaserFirstName)}`,
      { waitUntil: "domcontentloaded" },
    );
    await expect(
      page.getByRole("heading", { level: 1 }).first(),
    ).toContainText(purchaserFirstName, { timeout: 10_000 });

    const regenerated = await regenerateGiftClaim(
      request,
      submissionId,
      process.env.DO_DISPATCH_SECRET!,
    );
    expect(regenerated.outcome).toBe("regenerated");
    expect(regenerated.deliveryMethod).toBe("scheduled");
    expect(regenerated.claimUrl).toMatch(/\/gift\/claim\?token=[0-9a-f]{64}$/);

    const claimUrl = new URL(regenerated.claimUrl);
    const claimPath = claimUrl.pathname + claimUrl.search;

    await context.clearCookies();
    await seedGiftIntakeDraft(page, submissionId, { recipientEmail });
    await page.goto(claimPath);

    await page.waitForURL(/\/gift\/intake/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await waitForDraftRestore(page);
    await clickThroughIntakePages(page, 6);

    await page.locator("#field-art6-consent").check();
    await page.locator("#field-art9-consent").check();

    await page.getByTestId("intake-submit").click();
    await page.waitForURL(/\/thank-you\/.*[?&]gift=1[^"]*redeemed=1/, {
      timeout: 60_000,
    });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("birth-chart scheduled: purchaser → recipient claim → recipient listens with one magic-link round", async ({
    page,
    context,
    request,
  }) => {
    test.setTimeout(6 * 60 * 1000);

    const runId = crypto.randomUUID().slice(0, 8);
    const purchaserFirstName = `Purch${runId}`;
    const purchaserEmail = `gift-recipient-listen-purchaser+${runId}@withjosephine.com`;
    const recipientFirstName = `Recip${runId}`;
    const recipientEmail = `gift-recipient-listen-recipient+${runId}@withjosephine.com`;
    const giftMessage = `Automated recipient-listen round-trip ${runId}.`;

    const { stripeSessionId } = await drivePurchaserLeg(page, "scheduled", {
      purchaserFirstName,
      purchaserEmail,
      recipientFirstName,
      recipientEmail,
      giftMessage,
    });

    const submissionId =
      await findSubmissionIdByStripeSessionId(stripeSessionId);

    const paid = await pollUntilPaid(submissionId, { timeoutMs: 45_000 });
    expect(paid, "Stripe webhook should mark gift submission paid").toBe(true);

    const regenerated = await regenerateGiftClaim(
      request,
      submissionId,
      process.env.DO_DISPATCH_SECRET!,
    );
    expect(regenerated.outcome).toBe("regenerated");

    const claimUrl = new URL(regenerated.claimUrl);
    const claimPath = claimUrl.pathname + claimUrl.search;

    await context.clearCookies();
    await seedGiftIntakeDraft(page, submissionId, { recipientEmail });
    await page.goto(claimPath);

    await page.waitForURL(/\/gift\/intake/, { timeout: 30_000 });
    await waitForDraftRestore(page);
    await clickThroughIntakePages(page, 6);

    await page.locator("#field-art6-consent").check();
    await page.locator("#field-art9-consent").check();

    await page.getByTestId("intake-submit").click();
    await page.waitForURL(/\/thank-you\/.*[?&]gift=1[^"]*redeemed=1/, {
      timeout: 60_000,
    });

    const thankYouBody = (await page.content()).toLowerCase();
    expect(thankYouBody).not.toContain("thank you, there");

    await uploadDummyVoiceAndPdf(submissionId);
    const mirror = await forceD1Mirror(submissionId);
    expect(mirror.submissionId).toBe(submissionId);
    expect(
      mirror.awaitingAssets,
      "force-mode should see Sanity assets on the gift submission",
    ).toBe(0);

    // Cold listen visit — clear cookies again so the magic-link flow is
    // exercised fresh from the recipient's perspective.
    await context.clearCookies();
    await page.goto(`/listen/${submissionId}`);
    const signInForm = page.locator('form[action="/api/auth/magic-link"]');
    await expect(
      signInForm,
      "scheduled-gift recipient should see the sign-in card on a cold visit",
    ).toBeVisible();

    // Request a magic link — recipient's own email, NOT the purchaser's.
    await signInForm.locator('input[name="email"]').fill(recipientEmail);
    await signInForm.locator('button[type="submit"]').click();
    await page.waitForURL(new RegExp(`/listen/${submissionId}\\?sent=1`), {
      timeout: 15_000,
    });

    const { verifyUrl: baseVerifyUrl } = await issueMagicLink(recipientEmail);
    expect(baseVerifyUrl).toMatch(/\/auth\/verify\?token=[a-f0-9]{64}/);
    const verifyUrl = new URL(baseVerifyUrl);
    verifyUrl.searchParams.set("next", `/listen/${submissionId}`);

    await page.goto(verifyUrl.toString());
    const confirmForm = page.locator(
      'form[action="/api/auth/magic-link/verify"]',
    );
    await expect(confirmForm).toBeVisible();
    await confirmForm.locator('input[name="email"]').fill(recipientEmail);
    await confirmForm.locator('button[type="submit"]').click();

    await page.waitForURL(new RegExp(`/listen/${submissionId}\\?welcome=1`), {
      timeout: 15_000,
    });
    await expect(page.getByTestId("listen-welcome-ribbon")).toBeVisible();
    await expect(page.locator("audio")).toBeVisible();
    await expect(
      page.locator(`a[href="/api/listen/${submissionId}/pdf"]`),
    ).toBeVisible();
  });

  test("birth-chart self_send: purchaser → Stripe → claim URL ready to forward", async ({
    page,
    request,
  }) => {
    test.setTimeout(4 * 60 * 1000);

    const runId = crypto.randomUUID().slice(0, 8);
    const purchaserFirstName = `Selfsend${runId}`;
    const purchaserEmail = `gift-roundtrip-purchaser+${runId}@withjosephine.com`;
    const recipientFirstName = `Recipient${runId}`;
    const giftMessage = `Automated self-send round-trip ${runId}.`;

    const { stripeSessionId } = await drivePurchaserLeg(page, "self_send", {
      purchaserFirstName,
      purchaserEmail,
      recipientFirstName,
      // Unused for self_send: the form omits the recipient-email input.
      recipientEmail: "",
      giftMessage,
    });

    const submissionId =
      await findSubmissionIdByStripeSessionId(stripeSessionId);

    // Self-send thank-you copy is different (purchaser forwards the link
    // themselves) — still rendering the purchaser slot via the query
    // override is the load-bearing Becky-bug-#4 assertion.
    await page.goto(
      `/thank-you/birth-chart?gift=1&purchaserFirstName=${encodeURIComponent(purchaserFirstName)}`,
      { waitUntil: "domcontentloaded" },
    );
    await expect(
      page.getByRole("heading", { level: 1 }).first(),
    ).toContainText(purchaserFirstName, { timeout: 10_000 });

    const regenerated = await regenerateGiftClaim(
      request,
      submissionId,
      process.env.DO_DISPATCH_SECRET!,
    );
    expect(regenerated.outcome).toBe("regenerated");
    expect(regenerated.deliveryMethod).toBe("self_send");
    expect(regenerated.claimUrl).toMatch(/\/gift\/claim\?token=[0-9a-f]{64}$/);

    // Spot-check that the claim landing page resolves the token (no recipient
    // intake exercised — recipientEmail is missing on self_send submissions
    // and gift-redeem would 422). Assert specifically that we landed on
    // `/gift/intake?welcome=1` — the success target. A bare `getByRole`
    // heading match used to pass even when the error page rendered, because
    // error.tsx's "an unexpected error occurred" is itself a level-1 heading.
    const claimUrl = new URL(regenerated.claimUrl);
    await page.context().clearCookies();
    await page.goto(claimUrl.pathname + claimUrl.search);
    await page.waitForURL(/\/gift\/intake\?welcome=1/, { timeout: 30_000 });
    await expect(
      page.getByRole("heading", { level: 1 }),
    ).not.toContainText(/unexpected error|something went wrong/i);
  });
});
