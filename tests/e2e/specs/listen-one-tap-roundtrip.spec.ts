// Phase 1 one-tap listen-token roundtrip (ISC-69 through ISC-77).
//
// This spec mints listen tokens via the staging worker's
// `/api/internal/test-mint-token` admin-gated endpoint, then exercises them
// against staging's `/listen/[id]` interstitial + `/api/listen/[id]/redeem`
// route. The endpoint signs tokens with staging's own `AUTH_TOKEN_SECRET`, so
// the CI runner only needs `ADMIN_API_KEY` (already wired in
// `.github/workflows/e2e-sandbox.yml`). Rotating `AUTH_TOKEN_SECRET` no
// longer breaks the spec; it only invalidates outstanding tokens.
//
// Self-activating: a one-shot beforeAll probes /api/listen/__probe__/redeem and
// skips the suite when staging answers 404 (route not deployed yet). Replaces
// the older env-var-gated pattern from listen-roundtrip.spec.ts so this spec
// runs the moment release/v1.4.0 deploys, with no manual flip required.

import { randomUUID } from "node:crypto";

import { expect, type Page, test } from "@playwright/test";

import { SANDBOX_DOMAIN, SANDBOX_EMAIL_PREFIXES } from "@/lib/booking/sandboxEmails";

import {
  clickThroughIntakePages,
  seedIntakeDraft,
  waitForDraftRestore,
} from "../helpers/intakeDraft";
import { mintTokenForTest } from "../helpers/mintTokenForTest";
import { cleanupSandboxResidue } from "../helpers/sandboxResidueCleanup";
import {
  forceD1Mirror,
  uploadDummyVoiceAndPdf,
} from "../helpers/sanityE2EAssets";
import {
  escapeSqliteLiteral,
  findSubmissionIdByStripeSessionId,
  pollUntilPaid,
  queryStagingD1,
  sandboxRequestHeaders,
} from "../helpers/stagingApi";
import { fillStripeCheckout } from "../helpers/stripeCheckout";
import { stubTurnstile } from "../helpers/turnstileStub";

test.use({ extraHTTPHeaders: sandboxRequestHeaders() });

let redeemRouteAvailable = false;
let mintEndpointAvailable = false;

function skipIfNotDeployed(): void {
  test.skip(
    !redeemRouteAvailable || !mintEndpointAvailable,
    "Phase 1 redeem route or /api/internal/test-mint-token endpoint not deployed on staging yet (auto-detected via probe).",
  );
}

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

  const redirectUrl = new URL(page.url());
  const stripeSessionId = redirectUrl.searchParams.get("sessionId");
  if (!stripeSessionId) {
    throw new Error(`Stripe redirect missing sessionId: ${redirectUrl.toString()}`);
  }
  return findSubmissionIdByStripeSessionId(stripeSessionId);
}

// Recover `recipient_user_id` from D1 after the Stripe webhook has mirrored the
// submission. `findOrCreateUser` runs at intake; the user row exists by the time
// the submission lands in D1 with status=paid.
async function fetchRecipientUserId(submissionId: string): Promise<string> {
  const rows = await queryStagingD1<{ recipient_user_id: string | null }>(
    `SELECT recipient_user_id
       FROM submissions
      WHERE id = '${escapeSqliteLiteral(submissionId)}'
      LIMIT 1`,
  );
  const recipientUserId = rows[0]?.recipient_user_id;
  if (!recipientUserId) {
    throw new Error(
      `[listen-one-tap] no recipient_user_id for submission ${submissionId}`,
    );
  }
  return recipientUserId;
}

// Set up the full pre-token state: paid submission, delivered assets, mirrored
// D1 row, and a fresh valid token. Used by Scenarios A, B, C, G, H.
async function setupReadyToRedeem(
  page: Page,
  email: string,
): Promise<{ submissionId: string; recipientUserId: string; token: string }> {
  const submissionId = await createPaidSubmission(page, email);
  const paid = await pollUntilPaid(submissionId, { timeoutMs: 45_000 });
  expect(paid, "Stripe webhook should mark submission paid").toBe(true);

  await uploadDummyVoiceAndPdf(submissionId);
  const mirror = await forceD1Mirror(submissionId);
  expect(mirror.submissionId).toBe(submissionId);
  expect(mirror.awaitingAssets, "force-mode should see Sanity assets").toBe(0);

  const recipientUserId = await fetchRecipientUserId(submissionId);
  const token = await mintTokenForTest({
    page,
    submissionId,
    recipientUserId,
    mintSource: "cron_day7",
  });
  return { submissionId, recipientUserId, token };
}

test.describe("Listen one-tap round-trip, staging", () => {
  test.beforeAll(async ({ request }) => {
    // Auto-detect deployment: POST against a synthetic id with no token body
    // triggers the redeem handler's fall-through redirect (303) when the route
    // exists, or a 404 from Next's router when it doesn't. Anything not-404
    // means staging carries the Phase 1 code.
    const probe = await request.post("/api/listen/__deploy_probe__/redeem", {
      failOnStatusCode: false,
      maxRedirects: 0,
    });
    redeemRouteAvailable = probe.status() !== 404;
    if (!redeemRouteAvailable) {
      console.log(
        `[listen-one-tap] redeem route probe -> ${probe.status()}, skipping suite until release/v1.4.0 deploys`,
      );
      return;
    }

    // Probe the v1.10.0 test-mint-token endpoint. A 200 confirms staging is on
    // release/v1.10.0 (or later). Sandbox CI on PR-open runs against the
    // prev-deploy staging worker, so the suite skips cleanly until v1.10.0
    // deploys. Side-effect-free: the minted token is discarded.
    const mintProbe = await request.post("/api/internal/test-mint-token", {
      data: {
        submissionId: "__probe__",
        recipientUserId: "__probe__",
        mintSource: "cron_day7",
      },
      headers: {
        "content-type": "application/json",
        "x-admin-token": process.env.ADMIN_API_KEY ?? "",
      },
      failOnStatusCode: false,
    });
    mintEndpointAvailable = mintProbe.status() === 200;
    if (!mintEndpointAvailable) {
      console.log(
        `[listen-one-tap] test-mint-token endpoint probe -> ${mintProbe.status()}, skipping suite until release/v1.10.0 deploys`,
      );
      return;
    }

    const { sanityDeleted } = await cleanupSandboxResidue({
      emailPrefix: SANDBOX_EMAIL_PREFIXES.listenOneTap,
    });
    console.log(
      `[listen-one-tap] preflight wipe: D1 cleared + ${sanityDeleted} Sanity submission(s) deleted`,
    );
  });

  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await stubTurnstile(page);
  });

  test("Scenario A: happy path GET renders interstitial with token in hidden field", async ({
    page,
  }) => {
    skipIfNotDeployed();
    test.setTimeout(4 * 60 * 1000);

    const runId = randomUUID().slice(0, 8);
    const email = `${SANDBOX_EMAIL_PREFIXES.listenOneTap}a-${runId}${SANDBOX_DOMAIN}`;
    const { submissionId, token } = await setupReadyToRedeem(page, email);

    const response = await page.goto(`/listen/${submissionId}?t=${token}`);
    expect(response?.status(), "GET interstitial should return 200").toBe(200);

    // Interstitial submit form posts to redeem route with token in hidden input.
    const form = page.locator(
      `form[action="/api/listen/${submissionId}/redeem"][method="POST" i]`,
    );
    await expect(form).toBeVisible();

    const hiddenToken = form.locator('input[type="hidden"][name="t"]');
    await expect(hiddenToken).toHaveAttribute("value", token);

    const submitButton = form.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();

    // GET MUST NOT set the session cookie; that's the redeem-route's job.
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "__Host-listen_session");
    expect(
      sessionCookie,
      "GET interstitial must not mint a session cookie",
    ).toBeUndefined();
  });

  test("Scenario B: happy path POST → 303 + Set-Cookie + delivered surface", async ({
    page,
  }) => {
    skipIfNotDeployed();
    test.setTimeout(4 * 60 * 1000);

    const runId = randomUUID().slice(0, 8);
    const email = `${SANDBOX_EMAIL_PREFIXES.listenOneTap}b-${runId}${SANDBOX_DOMAIN}`;
    const { submissionId, token } = await setupReadyToRedeem(page, email);

    await page.goto(`/listen/${submissionId}?t=${token}`);
    const form = page.locator(
      `form[action="/api/listen/${submissionId}/redeem"]`,
    );
    await expect(form).toBeVisible();

    await form.locator('button[type="submit"]').click();
    await page.waitForURL(new RegExp(`/listen/${submissionId}\\?welcome=1`), {
      timeout: 15_000,
    });

    // Delivered surface assertions mirror listen-roundtrip.spec.ts.
    await expect(page.getByTestId("listen-welcome-ribbon")).toBeVisible();
    await expect(page.locator("audio")).toBeVisible();
    await expect(
      page.locator(`a[href="/api/listen/${submissionId}/pdf"]`),
    ).toBeVisible();

    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "__Host-listen_session");
    expect(
      sessionCookie,
      "successful redeem should set __Host-listen_session",
    ).toBeDefined();
  });

  test("Scenario C: single-use enforced, replay token falls to signIn", async ({
    page,
  }) => {
    skipIfNotDeployed();
    test.setTimeout(4 * 60 * 1000);

    const runId = randomUUID().slice(0, 8);
    const email = `${SANDBOX_EMAIL_PREFIXES.listenOneTap}c-${runId}${SANDBOX_DOMAIN}`;
    const { submissionId, token } = await setupReadyToRedeem(page, email);

    // First redeem via page.request so we can inspect the 303 directly.
    const firstRedeem = await page.request.post(
      `/api/listen/${submissionId}/redeem`,
      {
        form: { t: token },
        maxRedirects: 0,
        failOnStatusCode: false,
      },
    );
    expect(firstRedeem.status(), "first redeem should 303").toBe(303);
    const firstLocation = firstRedeem.headers().location ?? "";
    expect(firstLocation).toContain("welcome=1");

    // Clear cookies to simulate a fresh session/device replaying the same token.
    await page.context().clearCookies();

    const replay = await page.request.post(
      `/api/listen/${submissionId}/redeem`,
      {
        form: { t: token },
        maxRedirects: 0,
        failOnStatusCode: false,
      },
    );
    // Single-use ledger blocks the second redeem. Same 303 shape, no welcome,
    // no cookie. (Indistinguishable response shape is intentional; see the
    // route's fallThroughResponse comment.)
    expect(replay.status(), "replay redeem should 303").toBe(303);
    const replayLocation = replay.headers().location ?? "";
    expect(replayLocation).not.toContain("welcome=1");
    expect(replayLocation).toContain(`/listen/${submissionId}`);
    expect(
      replay.headers()["set-cookie"] ?? "",
      "replay must not mint a new session cookie",
    ).not.toMatch(/__Host-listen_session=/);

    // Following the redirect lands on the signIn form (no active session).
    await page.goto(`/listen/${submissionId}`);
    await expect(
      page.locator('form[action="/api/auth/magic-link"]'),
    ).toBeVisible();
  });

  test("Scenario D: expired token → GET falls to signIn", async ({ page }) => {
    skipIfNotDeployed();
    test.setTimeout(4 * 60 * 1000);

    const runId = randomUUID().slice(0, 8);
    const email = `${SANDBOX_EMAIL_PREFIXES.listenOneTap}d-${runId}${SANDBOX_DOMAIN}`;
    const submissionId = await createPaidSubmission(page, email);
    const paid = await pollUntilPaid(submissionId, { timeoutMs: 45_000 });
    expect(paid).toBe(true);
    await uploadDummyVoiceAndPdf(submissionId);
    await forceD1Mirror(submissionId);

    const recipientUserId = await fetchRecipientUserId(submissionId);
    // ttlMs negative ⇒ expMs is in the past ⇒ verifyListenToken returns
    // { valid: false, reason: "expired" } and the page falls through.
    const expiredToken = await mintTokenForTest({
      page,
      submissionId,
      recipientUserId,
      mintSource: "cron_day7",
      ttlMs: -1,
    });

    await page.goto(`/listen/${submissionId}?t=${expiredToken}`);
    await expect(
      page.locator('form[action="/api/auth/magic-link"]'),
      "signIn form should render for expired token",
    ).toBeVisible();
    await expect(
      page.locator(`form[action="/api/listen/${submissionId}/redeem"]`),
      "interstitial form must NOT render for expired token",
    ).toHaveCount(0);
  });

  test("Scenario E: tampered token → GET falls to signIn", async ({ page }) => {
    skipIfNotDeployed();
    test.setTimeout(4 * 60 * 1000);

    const runId = randomUUID().slice(0, 8);
    const email = `${SANDBOX_EMAIL_PREFIXES.listenOneTap}e-${runId}${SANDBOX_DOMAIN}`;
    const { submissionId, token } = await setupReadyToRedeem(page, email);

    // Mutate one character in the signature portion (after the "."). Flip a
    // base64url char to a different valid base64url char so re-encoding still
    // succeeds; only the HMAC compare should fail.
    const dotIndex = token.indexOf(".");
    expect(dotIndex, "token must have payload.sig shape").toBeGreaterThan(0);
    const payloadPart = token.slice(0, dotIndex);
    const sigPart = token.slice(dotIndex + 1);
    const sigFirstChar = sigPart[0]!;
    const flipped = sigFirstChar === "A" ? "B" : "A";
    const tamperedToken = `${payloadPart}.${flipped}${sigPart.slice(1)}`;
    expect(tamperedToken).not.toBe(token);

    await page.goto(`/listen/${submissionId}?t=${tamperedToken}`);
    await expect(
      page.locator('form[action="/api/auth/magic-link"]'),
      "signIn form should render for tampered token",
    ).toBeVisible();
    await expect(
      page.locator(`form[action="/api/listen/${submissionId}/redeem"]`),
      "interstitial form must NOT render for tampered token",
    ).toHaveCount(0);
  });

  test("Scenario F: legacy email regression, no token, no cookie, signIn form", async ({
    page,
  }) => {
    skipIfNotDeployed();
    test.setTimeout(4 * 60 * 1000);

    const runId = randomUUID().slice(0, 8);
    const email = `${SANDBOX_EMAIL_PREFIXES.listenOneTap}f-${runId}${SANDBOX_DOMAIN}`;
    const { submissionId } = await setupReadyToRedeem(page, email);

    // Migration guard: pre-existing day-7 emails in the wild carry no `?t=`.
    // Behavior must match the historical magic-link-only flow.
    await page.goto(`/listen/${submissionId}`);
    await expect(
      page.locator('form[action="/api/auth/magic-link"]'),
      "legacy GET must still render the magic-link sign-in form",
    ).toBeVisible();
    await expect(
      page.locator(`form[action="/api/listen/${submissionId}/redeem"]`),
      "interstitial form must not render without ?t=",
    ).toHaveCount(0);
  });

  test("Scenario G: 303 redirect carries Cache-Control no-store", async ({
    page,
  }) => {
    skipIfNotDeployed();
    test.setTimeout(4 * 60 * 1000);

    const runId = randomUUID().slice(0, 8);
    const email = `${SANDBOX_EMAIL_PREFIXES.listenOneTap}g-${runId}${SANDBOX_DOMAIN}`;
    const { submissionId, token } = await setupReadyToRedeem(page, email);

    const response = await page.request.post(
      `/api/listen/${submissionId}/redeem`,
      {
        form: { t: token },
        maxRedirects: 0,
        failOnStatusCode: false,
      },
    );
    expect(response.status()).toBe(303);
    const cacheControl = response.headers()["cache-control"] ?? "";
    expect(
      cacheControl.toLowerCase(),
      `Cache-Control should include no-store (got "${cacheControl}")`,
    ).toContain("no-store");
  });

  test("Scenario H: cookie attributes match the magic-link path", async ({
    page,
  }) => {
    skipIfNotDeployed();
    test.setTimeout(4 * 60 * 1000);

    const runId = randomUUID().slice(0, 8);
    const email = `${SANDBOX_EMAIL_PREFIXES.listenOneTap}h-${runId}${SANDBOX_DOMAIN}`;
    const { submissionId, token } = await setupReadyToRedeem(page, email);

    const response = await page.request.post(
      `/api/listen/${submissionId}/redeem`,
      {
        form: { t: token },
        maxRedirects: 0,
        failOnStatusCode: false,
      },
    );
    expect(response.status()).toBe(303);
    const rawSetCookie = response.headers()["set-cookie"] ?? "";
    expect(rawSetCookie, "redeem must Set-Cookie on success").not.toBe("");

    // Byte-equal attribute set with the verify route's cookie writer. Both
    // mint `__Host-listen_session=…; Path=/; HttpOnly; Secure; SameSite=Lax;
    // Max-Age=<SESSION_TTL_MS/1000>`.
    expect(rawSetCookie).toMatch(/__Host-listen_session=/);
    expect(rawSetCookie).toMatch(/Path=\//);
    expect(rawSetCookie).toMatch(/HttpOnly/);
    expect(rawSetCookie).toMatch(/Secure/);
    expect(rawSetCookie).toMatch(/SameSite=Lax/);
    expect(rawSetCookie).toMatch(/Max-Age=\d+/);
  });
});
