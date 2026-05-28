import { randomUUID } from "node:crypto";

import { expect, type Page, test } from "@playwright/test";

import { mintLibraryToken } from "@/lib/auth/libraryToken";

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
  pollUntilPaid,
  queryStagingD1,
  sandboxRequestHeaders,
} from "../helpers/stagingApi";
import { fillStripeCheckout } from "../helpers/stripeCheckout";
import { stubTurnstile } from "../helpers/turnstileStub";

test.use({ extraHTTPHeaders: sandboxRequestHeaders() });

let redeemRouteAvailable = false;

function skipIfNotDeployed(): void {
  test.skip(
    !redeemRouteAvailable,
    "Phase 2 library redeem route not deployed on staging yet (auto-detected via probe).",
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
      `[library-one-tap] no recipient_user_id for submission ${submissionId}`,
    );
  }
  return recipientUserId;
}

async function setupReadyUser(
  page: Page,
  email: string,
): Promise<{ submissionId: string; userId: string; token: string }> {
  const submissionId = await createPaidSubmission(page, email);
  const paid = await pollUntilPaid(submissionId, { timeoutMs: 45_000 });
  expect(paid, "Stripe webhook should mark submission paid").toBe(true);

  await uploadDummyVoiceAndPdf(submissionId);
  const mirror = await forceD1Mirror(submissionId);
  expect(mirror.submissionId).toBe(submissionId);

  const userId = await fetchRecipientUserId(submissionId);
  const token = await mintLibraryToken({
    userId,
    mintSource: "order_confirmation",
  });
  return { submissionId, userId, token };
}

test.describe("Library one-tap round-trip, staging", () => {
  test.beforeAll(async ({ request }) => {
    const probe = await request.post("/api/library/redeem", {
      failOnStatusCode: false,
      maxRedirects: 0,
    });
    redeemRouteAvailable = probe.status() !== 404;
    if (!redeemRouteAvailable) {
      console.log(
        `[library-one-tap] redeem route probe -> ${probe.status()}, skipping suite until release/v1.4.0 deploys`,
      );
      return;
    }

    const { sanityDeleted } = await cleanupSandboxResidue({
      emailPrefix: "library-one-tap+",
    });
    console.log(
      `[library-one-tap] preflight wipe: D1 cleared + ${sanityDeleted} Sanity submission(s) deleted`,
    );
  });

  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await stubTurnstile(page);
  });

  test("Scenario A: happy path GET renders welcome interstitial with token in hidden field", async ({
    page,
  }) => {
    skipIfNotDeployed();
    test.setTimeout(4 * 60 * 1000);

    const runId = randomUUID().slice(0, 8);
    const email = `library-one-tap+a-${runId}@withjosephine.com`;
    const { token } = await setupReadyUser(page, email);

    const response = await page.goto(`/my-readings/welcome?t=${token}`);
    expect(response?.status(), "GET interstitial should return 200").toBe(200);

    const form = page.locator(
      'form[action="/api/library/redeem"][method="POST" i]',
    );
    await expect(form).toBeVisible();

    const hiddenToken = form.locator('input[type="hidden"][name="t"]');
    await expect(hiddenToken).toHaveAttribute("value", token);

    const submitButton = form.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();

    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "__Host-listen_session");
    expect(
      sessionCookie,
      "GET interstitial must not mint a session cookie",
    ).toBeUndefined();
  });

  test("Scenario B: happy path POST -> 303 + Set-Cookie + readings surface", async ({
    page,
  }) => {
    skipIfNotDeployed();
    test.setTimeout(4 * 60 * 1000);

    const runId = randomUUID().slice(0, 8);
    const email = `library-one-tap+b-${runId}@withjosephine.com`;
    const { token } = await setupReadyUser(page, email);

    await page.goto(`/my-readings/welcome?t=${token}`);
    const form = page.locator('form[action="/api/library/redeem"]');
    await expect(form).toBeVisible();

    await form.locator('button[type="submit"]').click();
    await page.waitForURL(/\/my-readings\?welcome=1/, { timeout: 15_000 });

    await expect(page.getByRole("tablist")).toBeVisible();

    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === "__Host-listen_session");
    expect(
      sessionCookie,
      "successful library redeem should set __Host-listen_session",
    ).toBeDefined();
  });

  test("Scenario C: single-use enforced, replay token falls to signIn", async ({
    page,
  }) => {
    skipIfNotDeployed();
    test.setTimeout(4 * 60 * 1000);

    const runId = randomUUID().slice(0, 8);
    const email = `library-one-tap+c-${runId}@withjosephine.com`;
    const { token } = await setupReadyUser(page, email);

    const firstRedeem = await page.request.post("/api/library/redeem", {
      form: { t: token },
      maxRedirects: 0,
      failOnStatusCode: false,
    });
    expect(firstRedeem.status(), "first redeem should 303").toBe(303);
    expect(firstRedeem.headers().location ?? "").toContain("welcome=1");

    await page.context().clearCookies();

    const replay = await page.request.post("/api/library/redeem", {
      form: { t: token },
      maxRedirects: 0,
      failOnStatusCode: false,
    });
    expect(replay.status(), "replay redeem should 303").toBe(303);
    const replayLocation = replay.headers().location ?? "";
    expect(replayLocation).not.toContain("welcome=1");
    expect(replayLocation).toContain("/my-readings");
    expect(
      replay.headers()["set-cookie"] ?? "",
      "replay must not mint a new session cookie",
    ).not.toMatch(/__Host-listen_session=/);
  });

  test("Scenario D: expired token -> 303 fallback, no cookie", async ({ page }) => {
    skipIfNotDeployed();
    test.setTimeout(4 * 60 * 1000);

    const runId = randomUUID().slice(0, 8);
    const email = `library-one-tap+d-${runId}@withjosephine.com`;
    const { userId } = await setupReadyUser(page, email);

    const expiredToken = await mintLibraryToken({
      userId,
      mintSource: "order_confirmation",
      ttlMs: -1,
    });

    const response = await page.request.post("/api/library/redeem", {
      form: { t: expiredToken },
      maxRedirects: 0,
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(303);
    expect(response.headers()["set-cookie"] ?? "").not.toMatch(
      /__Host-listen_session=/,
    );
  });

  test("Scenario E: tampered token -> 303 fallback, no cookie", async ({ page }) => {
    skipIfNotDeployed();
    test.setTimeout(4 * 60 * 1000);

    const runId = randomUUID().slice(0, 8);
    const email = `library-one-tap+e-${runId}@withjosephine.com`;
    const { token } = await setupReadyUser(page, email);

    const dotIndex = token.indexOf(".");
    expect(dotIndex, "token must have payload.sig shape").toBeGreaterThan(0);
    const payloadPart = token.slice(0, dotIndex);
    const sigPart = token.slice(dotIndex + 1);
    const sigFirstChar = sigPart[0]!;
    const flipped = sigFirstChar === "A" ? "B" : "A";
    const tamperedToken = `${payloadPart}.${flipped}${sigPart.slice(1)}`;
    expect(tamperedToken).not.toBe(token);

    const response = await page.request.post("/api/library/redeem", {
      form: { t: tamperedToken },
      maxRedirects: 0,
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(303);
    expect(response.headers()["set-cookie"] ?? "").not.toMatch(
      /__Host-listen_session=/,
    );
  });

  test("Scenario F: bare /my-readings/welcome (no ?t=) -> 307/308 to /my-readings", async ({
    page,
  }) => {
    skipIfNotDeployed();

    const response = await page.request.get("/my-readings/welcome", {
      maxRedirects: 0,
      failOnStatusCode: false,
    });
    expect([302, 307, 308]).toContain(response.status());
    const location = response.headers().location ?? "";
    expect(location).toContain("/my-readings");
    expect(location).not.toContain("/welcome");
  });
});
