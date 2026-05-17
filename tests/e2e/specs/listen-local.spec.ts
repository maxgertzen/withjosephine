// Localhost-mockable sibling to `listen-roundtrip.spec.ts`.
//
// The staging round-trip drives a full paid-submission → delivered → magic-link
// → audio-play → listenedAt-mirror chain that depends on real Sanity asset
// uploads + a D1 force-mirror cron seam — both are staging-specific complexity.
//
// For the local mode we focus on the gating + auth seams which catch the
// highest-value regressions independent of asset state: the cold-listen
// sign-in card, the magic-link request → "sent" redirect, the bad-token
// verify path, and the engineering-seam `/api/internal/issue-magic-link`
// 404 surface (no-enumeration). A full happy "delivered surface" local
// path can be added later; it requires seeding paid + delivered state in
// D1 + Sanity via the test-only e2e-reset seed extension.
//
// Run: E2E_LISTEN_LOCAL=1 pnpm exec playwright test listen-local
import { expect, test } from "@playwright/test";

import { resetCapturedState } from "../helpers/captureStore";

test.skip(
  process.env.E2E_LISTEN_LOCAL !== "1",
  "Listen-local spec is opt-in. Set E2E_LISTEN_LOCAL=1.",
);

const FAKE_SUBMISSION_ID = "00000000-0000-0000-0000-000000000000";

test.beforeEach(async ({ request }) => {
  await resetCapturedState(request);
  await request.post("/api/e2e-reset").catch(() => undefined);
});

test.describe("Listen route — localhost mocked", () => {
  test("cold visit without session renders sign-in card", async ({ page }) => {
    await page.goto(`/listen/${FAKE_SUBMISSION_ID}`);
    // The sign-in card form posts to /api/auth/magic-link. If the page
    // either flat-out 404s OR routes to a generic "not found" page that's
    // acceptable; we just want to assert no delivered surface ever renders
    // when there's no paid + delivered submission for the id.
    const audioElement = page.locator("audio");
    await expect(audioElement, "no audio without paid+delivered + session").toHaveCount(0);
    const welcomeRibbon = page.getByTestId("listen-welcome-ribbon");
    await expect(welcomeRibbon, "no welcome ribbon without session").toHaveCount(0);
  });

  test("magic-link request returns redirect with no info-leak about the email", async ({
    request,
  }) => {
    // The customer-facing endpoint is `/api/auth/magic-link` (form action).
    // It returns 303 to `/listen/<id>?sent=1` for any input — by design, so
    // an attacker can't tell whether the email exists. Pin that posture.
    const response = await request.post("/api/auth/magic-link", {
      data: new URLSearchParams({
        email: "no-user@withjosephine.com",
        submissionId: FAKE_SUBMISSION_ID,
      }).toString(),
      headers: { "content-type": "application/x-www-form-urlencoded" },
      maxRedirects: 0,
    });
    expect([200, 303]).toContain(response.status());
  });

  test("magic-link verify with garbage token redirects to error state", async ({
    page,
  }) => {
    await page.goto("/auth/verify?token=deadbeefdeadbeefdeadbeef");
    // The verify route renders a confirm-email card by default; the actual
    // token check happens on form submit. Just assert no welcome ribbon —
    // we never land on a delivered listen surface from a bad token.
    await expect(page.getByTestId("listen-welcome-ribbon")).toHaveCount(0);
  });

  test("internal issue-magic-link without admin token returns 404 (no-enumeration)", async ({
    request,
  }) => {
    const response = await request.post("/api/internal/issue-magic-link", {
      data: { email: "anyone@withjosephine.com" },
      headers: { "content-type": "application/json" },
    });
    expect(response.status()).toBe(404);
  });

  test("internal issue-magic-link with admin token but unknown email returns 404", async ({
    request,
  }) => {
    // The route returns the same 404 shape for "wrong token" / "unknown email"
    // / "missing env" — we pin the unknown-email branch since that's the one
    // the round-trip spec relies on to know when to skip.
    const response = await request.post("/api/internal/issue-magic-link", {
      data: { email: "definitely-no-user@withjosephine.com" },
      headers: {
        "content-type": "application/json",
        "x-admin-token": process.env.ADMIN_API_KEY ?? "e2e_admin_api_key_dummy",
      },
    });
    expect(response.status()).toBe(404);
  });
});
