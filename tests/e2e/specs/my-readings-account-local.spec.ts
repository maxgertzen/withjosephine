import { expect, test } from "@playwright/test";

import { signInViaMagicLink } from "../helpers/auth";
import { resetCapturedState } from "../helpers/captureStore";
import { resetE2EDatabase } from "../helpers/e2eReset";

const SESSION_COOKIE = "__Host-listen_session";

test.beforeEach(async ({ request }) => {
  await resetCapturedState(request);
  await resetE2EDatabase(request);
});

test.describe("/my-readings account controls — mock mode", () => {
  test("authed library shows the owner email + Sign out, and no redundant Home link", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const email = "library-identity@withjosephine.com";

    await signInViaMagicLink(page, { email, next: "/my-readings" });

    // Identity chip (E / ia4v3hck): the top-bar shows whose library this is.
    await expect(page.getByText(email, { exact: true })).toBeVisible();

    // Sign out control posts to the revoke route.
    const signOut = page.locator('form[action="/api/auth/sign-out"] button[type="submit"]');
    await expect(signOut).toBeVisible();

    // Nav redundancy resolved (87n9qmbj): no second "Home" affordance.
    await expect(page.getByRole("link", { name: /^Home$/ })).toHaveCount(0);
  });

  test("Sign out ends the session and returns home", async ({ page }) => {
    test.setTimeout(90_000);
    const email = "library-signout@withjosephine.com";

    await signInViaMagicLink(page, { email, next: "/my-readings" });

    const before = await page.context().cookies();
    expect(before.find((c) => c.name === SESSION_COOKIE)).toBeDefined();

    await page.locator('form[action="/api/auth/sign-out"] button[type="submit"]').click();
    await page.waitForURL((url) => url.pathname === "/", { timeout: 15_000 });

    const after = await page.context().cookies();
    const session = after.find((c) => c.name === SESSION_COOKIE);
    expect(session === undefined || session.value === "").toBe(true);
  });

  test("Export my data shows a success confirmation on 202", async ({ page }) => {
    test.setTimeout(90_000);
    await page.route("**/api/privacy/export", (route) =>
      route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({ submissionCount: 0, expiresInSeconds: 604800 }),
      }),
    );

    await signInViaMagicLink(page, { email: "library-export-ok@withjosephine.com", next: "/my-readings" });
    await page.getByRole("button", { name: /export my data/i }).click();

    await expect(page.getByRole("status")).toContainText(/download link|on its way/i);
  });

  test("Export my data surfaces the server message on a 429 throttle", async ({ page }) => {
    test.setTimeout(90_000);
    const throttleMessage = "Export already requested recently. Please check your email.";
    await page.route("**/api/privacy/export", (route) =>
      route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({ error: throttleMessage }),
      }),
    );

    await signInViaMagicLink(page, { email: "library-export-throttle@withjosephine.com", next: "/my-readings" });
    await page.getByRole("button", { name: /export my data/i }).click();

    await expect(page.getByRole("status")).toContainText(throttleMessage);
  });
});
