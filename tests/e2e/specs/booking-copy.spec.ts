import { expect, test } from "@playwright/test";

// The Issue #1 formatNote/deliveryNote guard was removed: neither field renders
// on any page since the entry page was deleted.
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
