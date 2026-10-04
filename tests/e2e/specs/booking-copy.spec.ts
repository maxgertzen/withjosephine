import { expect, test } from "@playwright/test";

import { registerStripeSession } from "../helpers/stripeStub";

const SESSION_ID = "cs_test_phase4booklane";

test.describe("Thank-you copy ≠ email content (Issue #5)", () => {
  test("thank-you page does not promise 'copy of your answers' unless OrderConfirmation email actually sends it", async ({
    page,
    request,
  }) => {
    await registerStripeSession(request, {
      id: SESSION_ID,
      client_reference_id: crypto.randomUUID(),
      amount_total: 12900,
      currency: "usd",
    });
    await page.goto(`/thank-you/soul-blueprint?sessionId=${SESSION_ID}`);
    const body = await page.getByRole("main").textContent();
    expect(body, "thank-you body").not.toMatch(/copy of your answers/i);
  });
});
