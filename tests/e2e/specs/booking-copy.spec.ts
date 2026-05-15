import { expect, test } from "@playwright/test";

test.describe("Booking-page copy uniqueness (Issue #1)", () => {
  test.fixme(
    true,
    "Unblocked by P4.1 — Sanity migration clears `formatNote` duplicate against `deliveryNote` + defaults updated. Today `formatNote` and `deliveryNote` repeat 'voice note + PDF, 7 days' content. Test compares the two strings and asserts no substring overlap >40 chars.",
  );

  test("formatNote and deliveryNote don't substring-overlap >40 chars", async ({ page }) => {
    await page.goto("/book/soul-blueprint");
    const formatNote = await page.getByText(/voice note/i).first().textContent();
    const deliveryNote = await page.getByText(/7 days/i).first().textContent();
    const overlap = longestCommonSubstring(formatNote ?? "", deliveryNote ?? "");
    expect(overlap.length, `formatNote/deliveryNote overlap "${overlap}"`).toBeLessThan(40);
  });
});

test.describe("Thank-you copy ≠ email content (Issue #5)", () => {
  test.fixme(
    true,
    "Unblocked by P4.3 — thank-you page body trimmed (remove 'copy of your answers' if it's not in OrderConfirmation email). Compares the rendered thank-you page text to a known string we should NOT see if Becky's complaint is addressed.",
  );

  test("thank-you page does not promise 'copy of your answers' unless OrderConfirmation email actually sends it", async ({
    page,
  }) => {
    await page.goto("/thank-you/fixture-submission-id");
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
