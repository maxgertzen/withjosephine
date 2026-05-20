import { expect, test } from "@playwright/test";

import { resetCapturedState } from "../helpers/captureStore";
import { resetE2EDatabase } from "../helpers/e2eReset";

const FAKE_SUBMISSION_ID = "00000000-0000-0000-0000-000000000000";

test.beforeEach(async ({ request }) => {
  await resetCapturedState(request);
  await resetE2EDatabase(request);
});

test.describe("Listen route — mock mode", () => {
  test("cold visit without session does not render delivered surface", async ({ page }) => {
    await page.goto(`/listen/${FAKE_SUBMISSION_ID}`);
    await expect(page.locator("audio")).toHaveCount(0);
    await expect(page.getByTestId("listen-welcome-ribbon")).toHaveCount(0);
  });

  test("magic-link request returns no-info-leak redirect for any email", async ({ request }) => {
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

  test("magic-link verify with garbage token never reaches delivered surface", async ({ page }) => {
    await page.goto("/auth/verify?token=deadbeefdeadbeefdeadbeef");
    await expect(page.getByTestId("listen-welcome-ribbon")).toHaveCount(0);
  });

  test("internal issue-magic-link without admin token returns 404", async ({ request }) => {
    const response = await request.post("/api/internal/issue-magic-link", {
      data: { email: "anyone@withjosephine.com" },
      headers: { "content-type": "application/json" },
    });
    expect(response.status()).toBe(404);
  });

  test("internal issue-magic-link with admin token but unknown email returns 404", async ({
    request,
  }) => {
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
