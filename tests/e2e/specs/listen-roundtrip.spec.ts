/**
 * Listen round-trip Playwright spec — Phase 5 Bundle A.2.
 *
 * Drives the full delivered-reading customer journey end-to-end against
 * `staging.withjosephine.com`:
 *
 *   1. Reuse the booking flow (same pattern as `stripe-roundtrip.spec.ts`)
 *      to create a paid submission with a per-run UUID email so state stays
 *      isolated across runs.
 *   2. Poll Sanity until the Stripe webhook marks the submission paid.
 *   3. Mutate Sanity: upload dummy voice note + PDF assets + set
 *      `deliveredAt` (helper `uploadDummyVoiceAndPdf`).
 *   4. Force-mirror Sanity → D1 via the cron `?force=<id>` engineering seam
 *      so the listen page sees the assets without waiting for the daily
 *      cron window (which only includes submissions ≥7 days old).
 *   5. Visit `/listen/<id>` cold (no session) → sign-in card.
 *   6. Submit the email form → check-email card (no real Resend dispatch
 *      because staging has RESEND_DRY_RUN=1).
 *   7. Retrieve the raw token via `POST /api/internal/issue-magic-link`
 *      (engineering seam, no Resend involvement).
 *   8. Navigate to the verifyUrl → confirm-email card.
 *   9. Submit the confirm form → `/listen/<id>?welcome=1` with welcome ribbon
 *      and delivered surface (audio + PDF).
 *  10. Fetch `/api/listen/<id>/audio` with `Range: bytes=0-` to trigger the
 *      `listenedAt` async mirror.
 *  11. Poll Sanity until `listenedAt` is populated (≤15s ceiling).
 *
 * Env-gated by `E2E_LISTEN_ROUNDTRIP=1`. Ignored by the default chromium
 * project. Sourcing `.env.staging` provides CF Access + Sanity + ADMIN_API_KEY
 * + CRON_SECRET. If `SANITY_E2E_READ_TOKEN` isn't provisioned the helpers
 * fall back to `SANITY_READ_TOKEN` (which is in `.env.staging`).
 *
 * Run: `E2E_LISTEN_ROUNDTRIP=1 pnpm exec playwright test --reporter=line`
 */
import { randomUUID } from "node:crypto";

import { expect, type Page, test } from "@playwright/test";

import {
  clickThroughIntakePages,
  seedIntakeDraft,
  waitForDraftRestore,
} from "../helpers/intakeDraft";
import {
  forceD1Mirror,
  uploadDummyVoiceAndPdf,
} from "../helpers/sanityE2EAssets";
import {
  findSubmissionIdByStripeSessionId,
  issueMagicLink,
  pollSanityListenedAt,
  pollUntilPaid,
} from "../helpers/stagingApi";
import { fillStripeCheckout } from "../helpers/stripeCheckout";

const accessClientId = process.env.CF_ACCESS_CLIENT_ID;
const accessClientSecret = process.env.CF_ACCESS_CLIENT_SECRET;
const adminApiKey = process.env.ADMIN_API_KEY;

test.skip(
  process.env.E2E_LISTEN_ROUNDTRIP !== "1",
  "Listen round-trip spec is opt-in. Set E2E_LISTEN_ROUNDTRIP=1.",
);

test.skip(
  !accessClientId || !accessClientSecret,
  "CF Access service-token env vars missing. Source www/.env.staging first.",
);

test.skip(
  !adminApiKey,
  "ADMIN_API_KEY missing from .env.staging — the issue-magic-link engineering seam can't be exercised without it. Add ADMIN_API_KEY to .env.staging matching the staging worker secret.",
);

test.use({
  extraHTTPHeaders: {
    "CF-Access-Client-Id": accessClientId ?? "",
    "CF-Access-Client-Secret": accessClientSecret ?? "",
  },
});

async function createPaidSubmission(page: Page, email: string): Promise<string> {
  await seedIntakeDraft(page, "birth-chart", { values: { email } });

  await page.goto("/book/birth-chart");
  await page.locator('a[href="/book/birth-chart/letter"]').click();
  await page.waitForURL(/\/book\/birth-chart\/letter/, { timeout: 15_000 });

  await page.locator('a[href="/book/birth-chart/intake"]').click();
  await page.waitForURL(/\/book\/birth-chart\/intake/, { timeout: 15_000 });

  await waitForDraftRestore(page);
  await clickThroughIntakePages(page, 6);

  await page.locator("#field-art6-consent").check();
  await page.locator("#field-art9-consent").check();
  await page.locator("#field-cooling-off-consent").check();

  await page.getByTestId("intake-submit").click();

  await fillStripeCheckout(page, email);

  await page.waitForURL(/\/thank-you\//, { timeout: 60_000 });

  // Stripe Payment Link success_url is `/thank-you/<readingSlug>?sessionId=…`.
  // The `[readingId]` route param carries the reading slug — NOT the
  // submission id. Recover the real id by GROQ-polling Sanity for the
  // submission with matching `stripeSessionId`.
  const redirectUrl = new URL(page.url());
  const stripeSessionId = redirectUrl.searchParams.get("sessionId");
  if (!stripeSessionId) {
    throw new Error(`Stripe redirect missing sessionId: ${redirectUrl.toString()}`);
  }
  return findSubmissionIdByStripeSessionId(stripeSessionId);
}

test.describe("Listen round-trip — staging", () => {
  // FIXME (filed 2026-05-17): the booking-form pre-condition step intermittently
  // navigates to `/my-readings` instead of Stripe Checkout after the submit
  // click — most likely Cloudflare / Stripe bot detection treating our
  // Playwright origin as a returning session after many `*-roundtrip` runs in
  // the same window. Whitelisting our origin IP at the Cloudflare zone level
  // (or wiping the accumulated `*-roundtrip*` D1 + Sanity + auth_sessions
  // rows on staging) should restore reliable Stripe redirects. Tracked in
  // `docs/BACKLOG.md` → "Listen round-trip spec — re-enable after staging
  // hygiene". The infrastructure (issue-magic-link route, cron force-mode,
  // sanityE2EAssets helper, dummy fixtures) is already merged and reusable.
  test.fixme(
    true,
    "Booking pre-condition step redirects to /my-readings instead of Stripe on staging — see docs/BACKLOG.md.",
  );

  test("birth-chart: paid submission → delivered → magic-link → listen → listenedAt", async ({
    page,
  }) => {
    test.setTimeout(4 * 60 * 1000);

    const runId = randomUUID().slice(0, 8);
    const email = `listen-roundtrip+${runId}@withjosephine.com`;

    // 1+2. Create paid submission via the shared booking flow + wait for webhook.
    const submissionId = await createPaidSubmission(page, email);
    const paid = await pollUntilPaid(submissionId, { timeoutMs: 45_000 });
    expect(paid, "Stripe webhook should mark submission paid").toBe(true);

    // 3+4. Mutate Sanity to "delivered" then force-mirror Sanity → D1.
    await uploadDummyVoiceAndPdf(submissionId);
    const mirror = await forceD1Mirror(submissionId);
    expect(mirror.submissionId).toBe(submissionId);
    expect(mirror.awaitingAssets, "force-mode should see Sanity assets").toBe(0);

    // 5. Cold visit — no session cookie yet.
    await page.goto(`/listen/${submissionId}`);
    await expect(
      page.locator("h1"),
      "sign-in card should render when no session",
    ).toBeVisible();
    const signInForm = page.locator('form[action="/api/auth/magic-link"]');
    await expect(signInForm).toBeVisible();

    // 6. Request a magic link from the sign-in form. The server-side handler
    //    fires Resend (which is dry-run on staging) and redirects to
    //    /listen/<id>?sent=1 (the checkEmail state).
    await signInForm.locator('input[name="email"]').fill(email);
    await signInForm.locator('button[type="submit"]').click();
    await page.waitForURL(new RegExp(`/listen/${submissionId}\\?sent=1`), {
      timeout: 15_000,
    });

    // 7. Retrieve the raw token via the engineering seam.
    const { verifyUrl } = await issueMagicLink(email);
    expect(verifyUrl).toMatch(/\/auth\/verify\?token=[a-f0-9]{64}/);

    // 8. Navigate to the verify URL → confirm-email card.
    await page.goto(verifyUrl);
    const confirmForm = page.locator(
      'form[action="/api/auth/magic-link/verify"]',
    );
    await expect(confirmForm).toBeVisible();

    // 9. Submit confirm form → /listen/<id>?welcome=1 (delivered surface).
    await confirmForm.locator('input[name="email"]').fill(email);
    await confirmForm.locator('button[type="submit"]').click();
    await page.waitForURL(new RegExp(`/listen/${submissionId}\\?welcome=1`), {
      timeout: 15_000,
    });

    // Welcome ribbon + audio + PDF download all visible.
    await expect(page.getByTestId("listen-welcome-ribbon")).toBeVisible();
    await expect(page.locator("audio")).toBeVisible();
    await expect(
      page.locator(`a[href="/api/listen/${submissionId}/pdf"]`),
    ).toBeVisible();

    // 10. Fetch audio with a Range header from the SAME browser context so
    //     the __Host-listen_session cookie travels with the request. This
    //     triggers `scheduleListenedAtMirror` server-side.
    const audioResponse = await page.request.get(
      `/api/listen/${submissionId}/audio`,
      {
        headers: { Range: "bytes=0-" },
      },
    );
    expect([200, 206]).toContain(audioResponse.status());

    // 11. Poll Sanity for listenedAt to confirm the fire-and-forget mirror
    //     landed. Worker hot path typically takes 2-5s; ceiling is 15s.
    const listenedAt = await pollSanityListenedAt(submissionId, {
      timeoutMs: 15_000,
    });
    expect(listenedAt, "Sanity should report listenedAt within 15s").not.toBeNull();
    expect(listenedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const ageMs = Date.now() - new Date(listenedAt as string).getTime();
    expect(ageMs).toBeLessThan(30_000);
  });
});

// Document the SANITY_E2E_READ_TOKEN fallback explicitly so a reader
// inspecting the spec knows the helpers degrade gracefully without it.
// See helpers/stagingApi.ts → getStagingSanityReadClient().
