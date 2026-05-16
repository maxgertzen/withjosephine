import { expect, test } from "@playwright/test";

test.describe("Booking-page copy uniqueness (Issue #1)", () => {
  test("formatNote and deliveryNote don't substring-overlap >40 chars", async ({ page }) => {
    await page.goto("/book/soul-blueprint");
    const formatNote = await page.getByText(/voice note/i).first().textContent();
    const deliveryNote = await page.getByText(/7 days/i).first().textContent();
    const overlap = longestCommonSubstring(formatNote ?? "", deliveryNote ?? "");
    expect(overlap.length, `formatNote/deliveryNote overlap "${overlap}"`).toBeLessThan(40);
  });
});

test.describe("Thank-you copy ≠ email content (Issue #5)", () => {
  test("thank-you page does not promise 'copy of your answers' unless OrderConfirmation email actually sends it", async ({
    page,
  }) => {
    // sessionId is required by the page guard (production redirects /thank-you
    // without a Stripe session to the homepage); use a Stripe-test-shaped value
    // so the guard accepts it. The Stripe API lookup downstream returns whatever
    // MSW stubs (or falls back gracefully on error).
    await page.goto("/thank-you/soul-blueprint?sessionId=cs_test_phase4booklane");
    const body = await page.getByRole("main").textContent();
    expect(body, "thank-you body").not.toMatch(/copy of your answers/i);
  });
});

function longestCommonSubstring(a: string, b: string): string {
  if (!a || !b) return "";
  const m = a.length;
  const n = b.length;
  let max = 0;
  let endA = 0;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        if (dp[i][j] > max) {
          max = dp[i][j];
          endA = i;
        }
      }
    }
  }
  return a.slice(endA - max, endA);
}
