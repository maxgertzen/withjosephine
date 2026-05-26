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

let libraryRouteAvailable = false;

function skipIfNotDeployed(): void {
  test.skip(
    !libraryRouteAvailable,
    "Phase 2 library routes not deployed on staging yet (auto-detected via probe).",
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
    throw new Error(`[tabs] no recipient_user_id for submission ${submissionId}`);
  }
  return recipientUserId;
}

async function signInViaLibraryToken(page: Page, email: string): Promise<void> {
  const submissionId = await createPaidSubmission(page, email);
  const paid = await pollUntilPaid(submissionId, { timeoutMs: 45_000 });
  expect(paid, "Stripe webhook should mark submission paid").toBe(true);

  await uploadDummyVoiceAndPdf(submissionId);
  await forceD1Mirror(submissionId);

  const userId = await fetchRecipientUserId(submissionId);
  const token = await mintLibraryToken({
    userId,
    mintSource: "order_confirmation",
  });

  await page.goto(`/my-readings/welcome?t=${token}`);
  const form = page.locator('form[action="/api/library/redeem"]');
  await expect(form).toBeVisible();
  await form.locator('button[type="submit"]').click();
  await page.waitForURL(/\/my-readings(\?welcome=1)?$/, { timeout: 15_000 });
}

test.describe("My Readings tabs roundtrip, staging", () => {
  test.beforeAll(async ({ request }) => {
    const probe = await request.post("/api/library/redeem", {
      failOnStatusCode: false,
      maxRedirects: 0,
    });
    libraryRouteAvailable = probe.status() !== 404;
    if (!libraryRouteAvailable) {
      console.log(
        `[tabs] library redeem probe -> ${probe.status()}, skipping suite until release/v1.4.0 deploys`,
      );
      return;
    }

    const { sanityDeleted } = await cleanupSandboxResidue({
      emailPrefix: "tabs-roundtrip+",
    });
    console.log(
      `[tabs] preflight wipe: D1 cleared + ${sanityDeleted} Sanity submission(s) deleted`,
    );
  });

  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await stubTurnstile(page);
  });

  test("Scenario A: signed-in user sees tablist with readings tab active by default", async ({
    page,
  }) => {
    skipIfNotDeployed();
    test.setTimeout(4 * 60 * 1000);

    const runId = randomUUID().slice(0, 8);
    const email = `tabs-roundtrip+a-${runId}@withjosephine.com`;
    await signInViaLibraryToken(page, email);

    const tablist = page.getByRole("tablist");
    await expect(tablist).toBeVisible();

    const readingsTab = page.getByRole("tab", { name: /Readings/ });
    const giftsTab = page.getByRole("tab", { name: /Gifts/ });
    await expect(readingsTab).toHaveAttribute("aria-selected", "true");
    await expect(giftsTab).toHaveAttribute("aria-selected", "false");
  });

  test("Scenario B: clicking gifts tab updates URL to /my-readings/gifts", async ({
    page,
  }) => {
    skipIfNotDeployed();
    test.setTimeout(4 * 60 * 1000);

    const runId = randomUUID().slice(0, 8);
    const email = `tabs-roundtrip+b-${runId}@withjosephine.com`;
    await signInViaLibraryToken(page, email);

    await page.getByRole("tab", { name: /Gifts/ }).click();
    await page.waitForURL(/\/my-readings\/gifts/, { timeout: 5_000 });

    await expect(page.getByRole("tab", { name: /Gifts/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("tab", { name: /Readings/ })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  test("Scenario C: browser back from gifts -> readings tab active", async ({
    page,
  }) => {
    skipIfNotDeployed();
    test.setTimeout(4 * 60 * 1000);

    const runId = randomUUID().slice(0, 8);
    const email = `tabs-roundtrip+c-${runId}@withjosephine.com`;
    await signInViaLibraryToken(page, email);

    await page.getByRole("tab", { name: /Gifts/ }).click();
    await page.waitForURL(/\/my-readings\/gifts/, { timeout: 5_000 });

    await page.goBack();
    await page.waitForURL(/\/my-readings(\?welcome=1)?$/, { timeout: 5_000 });
    await expect(page.getByRole("tab", { name: /Readings/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("Scenario D: deep-link /my-readings/gifts lands on gifts tab active", async ({
    page,
  }) => {
    skipIfNotDeployed();
    test.setTimeout(4 * 60 * 1000);

    const runId = randomUUID().slice(0, 8);
    const email = `tabs-roundtrip+d-${runId}@withjosephine.com`;
    await signInViaLibraryToken(page, email);

    await page.goto("/my-readings/gifts");
    await expect(page.getByRole("tab", { name: /Gifts/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("Scenario E: legacy /my-gifts 308-redirects to /my-readings/gifts", async ({
    page,
  }) => {
    skipIfNotDeployed();

    const response = await page.request.get("/my-gifts", {
      maxRedirects: 0,
      failOnStatusCode: false,
    });
    expect([301, 307, 308]).toContain(response.status());
    const location = response.headers().location ?? "";
    expect(location).toContain("/my-readings/gifts");
  });
});
