import { randomUUID } from "node:crypto";

import { expect, type Page, test } from "@playwright/test";

import { AUDIT_EVENT_TYPE } from "@/lib/audit/eventTypes";
import { SANDBOX_DOMAIN, SANDBOX_EMAIL_PREFIXES } from "@/lib/booking/sandboxEmails";

import {
  clickThroughIntakePages,
  seedIntakeDraft,
  waitForDraftRestore,
} from "../helpers/intakeDraft";
import { cleanupSandboxResidue } from "../helpers/sandboxResidueCleanup";
import {
  forceD1Mirror,
  uploadDummyVoiceAndPdf,
} from "../helpers/sanityE2EAssets";
import {
  escapeSqliteLiteral,
  findSubmissionIdByStripeSessionId,
  issueMagicLink,
  pollSanityListenedAt,
  pollUntilPaid,
  queryStagingD1,
  sandboxRequestHeaders,
} from "../helpers/stagingApi";
import { fillStripeCheckout } from "../helpers/stripeCheckout";
import { stubTurnstile } from "../helpers/turnstileStub";

test.use({ extraHTTPHeaders: sandboxRequestHeaders() });

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
  test.beforeAll(async () => {
    const { sanityDeleted } = await cleanupSandboxResidue({
      emailPrefix: SANDBOX_EMAIL_PREFIXES.listenRoundtrip,
    });
    console.log(
      `[listen-roundtrip] preflight wipe: D1 cleared + ${sanityDeleted} Sanity submission(s) deleted`,
    );
  });

  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await stubTurnstile(page);
  });

  test("birth-chart: paid submission → delivered → magic-link → listen → listenedAt", async ({
    page,
  }) => {
    test.setTimeout(4 * 60 * 1000);

    const runId = randomUUID().slice(0, 8);
    const email = `${SANDBOX_EMAIL_PREFIXES.listenRoundtrip}${runId}${SANDBOX_DOMAIN}`;

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

    // Real magic-link emails include &next=/listen/<id>; the engineering
    // seam doesn't, so append it to match production safeNext resolution.
    const { verifyUrl: baseVerifyUrl } = await issueMagicLink(email);
    expect(baseVerifyUrl).toMatch(/\/auth\/verify\?token=[a-f0-9]{64}/);
    const verifyUrl = new URL(baseVerifyUrl);
    verifyUrl.searchParams.set("next", `/listen/${submissionId}`);

    await page.goto(verifyUrl.toString());
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
    // ListenView gates recipientGreeting on submission.isGift; self-purchase
    // must render no testid at all.
    await expect(page.getByTestId("listen-recipient-greeting")).toHaveCount(0);

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

    // 10b. The PDF download carries a personalized RFC 6266 Content-Disposition
    //      (filename* param), not the legacy slug-id name (lb3dn5t0 / Sub-PR K).
    const pdfResponse = await page.request.get(`/api/listen/${submissionId}/pdf`);
    expect(pdfResponse.status()).toBe(200);
    expect(pdfResponse.headers()["content-disposition"] ?? "").toMatch(/filename\*=UTF-8''/);

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

  test("link_issued audit row carries user_agent_hash", async () => {
    const rows = await queryStagingD1<{ user_agent_hash: string | null }>(
      `SELECT user_agent_hash
         FROM listen_audit
        WHERE event_type = '${escapeSqliteLiteral(AUDIT_EVENT_TYPE.link_issued)}'
        ORDER BY timestamp DESC
        LIMIT 1`,
    );
    expect(rows, "at least one link_issued row should exist on staging").toHaveLength(1);
    expect(
      rows[0]!.user_agent_hash,
      "user_agent_hash should be captured at link_issued time",
    ).toMatch(/^[0-9a-f]{64}$/);
  });
});

