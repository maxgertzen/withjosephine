import { expect, test } from "@playwright/test";

// C-3 — Recipient claim cookie expires after 30 minutes; mid-intake the
// recipient bounces to `/gift/claim`. Pre-fix, that surface rendered the
// generic "Open from your email" message — clear but cold. Post-fix, the
// `/gift/claim?expired=1` state renders a warmer "your link rested for a
// moment" message that explicitly tells the recipient the original email
// link still works.

test.describe("Gift claim — session-expired surface (C-3)", () => {
  test("/gift/claim?expired=1 renders the warmer session-expired copy", async ({
    page,
  }) => {
    await page.goto("/gift/claim?expired=1");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /rested|session|expired/i,
    );
    await expect(page.getByText(/from your original email again/i)).toBeVisible();
  });

  test("/gift/claim (no params) still renders the generic no-token surface (regression guard)", async ({
    page,
  }) => {
    await page.goto("/gift/claim");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /open from your email/i,
    );
  });

  test("/gift/intake without a valid claim cookie redirects to /gift/claim?expired=1", async ({
    page,
  }) => {
    const response = await page.goto("/gift/intake");
    expect(page.url()).toMatch(/\/gift\/claim\?expired=1/);
    expect(response?.status()).toBeLessThan(400);
  });
});
