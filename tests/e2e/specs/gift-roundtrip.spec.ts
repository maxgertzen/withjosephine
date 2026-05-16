// End-to-end gift round-trip against staging.
//
// Variant coverage:
//   - "scheduled": full purchaser → claim → recipient redeem chain.
//   - "self_send": purchaser leg + claim URL only — `/api/booking/gift-redeem`
//     requires `submission.recipientEmail`, which self_send omits.
//
// Submission id retrieval (load-bearing): the post-Stripe redirect lands on
// `/thank-you/<readingSlug>` — the `[readingId]` route param is the slug,
// not the submission id. The real id lives on `stripeSessionId` once the
// webhook mirror runs; we recover it by Sanity GROQ on `stripeSessionId`.
//
// Run: `set -a && source .env.staging && set +a && E2E_GIFT_ROUNDTRIP=1 pnpm exec playwright test`
import { expect, type Page, test } from "@playwright/test";

import { seedGiftIntakeDraft } from "../helpers/giftDraft";
import {
  clickThroughIntakePages,
  waitForDraftRestore,
} from "../helpers/intakeDraft";
import {
  findSubmissionIdByStripeSessionId,
  regenerateGiftClaim,
} from "../helpers/stagingApi";
import { fillStripeCheckout } from "../helpers/stripeCheckout";

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

async function datetimeLocalPlus(page: Page, minutes: number): Promise<string> {
  // `datetime-local` is timezone-naive. Compute in-browser so the value lands
  // in the future regardless of CI vs local timezone.
  return page.evaluate((m) => {
    const t = new Date(Date.now() + m * 60_000);
    const pad = (n: number): string => String(n).padStart(2, "0");
    return (
      `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}` +
      `T${pad(t.getHours())}:${pad(t.getMinutes())}`
    );
  }, minutes);
}

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
      dispatchSecret!,
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
    await page.locator("#field-cooling-off-consent").check();

    await page.getByTestId("intake-submit").click();
    await page.waitForURL(/\/thank-you\/.*[?&]gift=1[^"]*redeemed=1/, {
      timeout: 60_000,
    });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
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
      dispatchSecret!,
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
