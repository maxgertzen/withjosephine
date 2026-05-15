import { expect, test } from "@playwright/test";

const READINGS = [
  { slug: "soul-blueprint", expectedName: /Soul Blueprint/i },
  { slug: "birth-chart", expectedName: /Birth Chart/i },
  { slug: "akashic-record", expectedName: /Akashic/i },
];

test.describe("Intake page renders (smoke)", () => {
  for (const reading of READINGS) {
    test(`/book/${reading.slug}/intake renders without 500`, async ({ page }) => {
      const response = await page.goto(`/book/${reading.slug}/intake`);
      expect(response?.status(), `${reading.slug} should not 5xx`).toBeLessThan(500);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(/before we begin/i);
      const firstNameLabel = page
        .getByLabel(/first name/i)
        .first();
      await expect(firstNameLabel).toBeVisible();
    });
  }
});

test.describe("Booking happy-path with submit assertion", () => {
  test.fixme(
    true,
    "Unblocked by P1.4 — LegalAcknowledgments unconditional render. Today the consent section only renders when a Sanity consent-type field (non-`_unknown` suffix) exists; art6/art9 hardcoded checkboxes are gated on the same condition. After P1.4, the section renders unconditional and submit succeeds.",
  );

  for (const reading of READINGS) {
    test(`fills + submits ${reading.slug} → buy.stripe.com with client_reference_id`, async ({
      page,
    }) => {
      let stripeRedirectUrl: string | null = null;
      await page.route("https://buy.stripe.com/**", async (route) => {
        stripeRedirectUrl = route.request().url();
        await route.fulfill({
          status: 200,
          contentType: "text/html",
          body: "<html><body>mock stripe</body></html>",
        });
      });

      await page.goto(`/book/${reading.slug}/intake`);

      await page.getByLabel(/email/i).fill("e2e-test@withjosephine.com");
      await page.getByLabel(/first name/i).fill("E2E");
      await page.getByLabel(/last name/i).fill("Tester");

      const finalSubmit = page.getByRole("button", { name: /book|submit|continue to payment/i });
      while ((await finalSubmit.count()) === 0) {
        const next = page.getByRole("button", { name: /next|continue/i }).last();
        await next.click();
      }

      await page.getByRole("checkbox", { name: /Art\.?\s*6|lawful basis/i }).check();
      await page.getByRole("checkbox", { name: /Art\.?\s*9|sensitive/i }).check();
      await page.getByRole("checkbox", { name: /14[- ]?day|cooling[- ]?off|non[- ]refund/i }).check();

      await finalSubmit.click();
      await page.waitForURL(/buy\.stripe\.com/);

      expect(stripeRedirectUrl).not.toBeNull();
      expect(stripeRedirectUrl!).toMatch(/client_reference_id=/);
    });
  }
});

test.describe("Final-page acknowledgments without Sanity consentField (Issue #2)", () => {
  test.fixme(
    true,
    "Unblocked by P1.4 — LegalAcknowledgments renders art6/art9/cooling-off unconditionally; submit gates on all three. Today no consent-type field in Sanity = no consent UI at all = silent-fail submit.",
  );

  test("art6/art9/cooling-off render unconditional + block submit when unchecked", async ({
    page,
  }) => {
    await page.goto("/book/birth-chart/intake");

    await page.getByLabel(/email/i).fill("e2e-test@withjosephine.com");
    await page.getByLabel(/first name/i).fill("E2E");
    await page.getByLabel(/last name/i).fill("Tester");

    const next = page.getByRole("button", { name: /next|continue/i }).last();
    while ((await page.getByRole("button", { name: /book|submit|continue to payment/i }).count()) === 0) {
      await next.click();
    }

    await expect(page.getByRole("checkbox", { name: /Art\.?\s*6|lawful basis/i })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /Art\.?\s*9|sensitive/i })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /14[- ]?day|cooling[- ]?off|non[- ]refund/i })).toBeVisible();

    const submit = page.getByRole("button", { name: /book|submit|continue to payment/i });
    await submit.click();
    await expect(page.getByRole("alert")).toContainText(/acknowledg/i);
  });
});
