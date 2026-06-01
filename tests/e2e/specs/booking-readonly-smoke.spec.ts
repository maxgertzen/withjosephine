import { expect, test } from "@playwright/test";
import { createClient } from "@sanity/client";

import { SANDBOX_DOMAIN, SANDBOX_EMAIL_PREFIXES } from "@/lib/booking/sandboxEmails";

const STRIPE_LIVE_BUY_URL = /^https:\/\/buy\.stripe\.com\/[A-Za-z0-9_-]+/;

// Apex is parked while the launch hold-gate runs. Middleware short-circuits
// every path (including /api/*) to the under-construction page, so these
// assertions can't run yet. Flip APEX_UNPARKED=true on the workflow env
// when apex DNS is unparked.
const APEX_UNPARKED = process.env.APEX_UNPARKED === "true";

test.describe.configure({ mode: "parallel" });

test.describe("Prod read-only booking smoke", () => {
  test.skip(!APEX_UNPARKED, "Apex parked — smoke specs gated behind APEX_UNPARKED=true");

  test("booking entry page renders Sanity content", async ({ request }) => {
    const res = await request.get("/book/birth-chart");
    expect(res.status(), "GET /book/birth-chart should return 200").toBe(200);
    const html = await res.text();
    expect(
      html.toLowerCase(),
      "entry page should reference the birth-chart reading",
    ).toContain("birth chart");
    expect(
      html,
      "entry page should carry the /letter CTA href (RSC + Sanity composed)",
    ).toMatch(/\/book\/birth-chart\/letter/);
  });

  test("reading.stripePaymentLink matches buy.stripe.com shape", async () => {
    const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
    expect(
      projectId,
      "NEXT_PUBLIC_SANITY_PROJECT_ID must be set on the prod-smoke job",
    ).toBeTruthy();
    const client = createClient({
      projectId: projectId!,
      dataset: "production",
      apiVersion: "2025-01-01",
      useCdn: true,
    });
    const paymentLink = await client.fetch<string | null>(
      `*[_type=="reading" && slug.current=="birth-chart"][0].stripePaymentLink`,
    );
    expect(paymentLink, "reading.stripePaymentLink must be populated in prod CMS").toBeTruthy();
    expect(paymentLink!).toMatch(STRIPE_LIVE_BUY_URL);
  });

  test("/api/booking gate rejects dummy Turnstile token with 4xx", async ({ request }) => {
    const res = await request.post("/api/booking", {
      data: {
        readingSlug: "birth-chart",
        values: {
          email: `${SANDBOX_EMAIL_PREFIXES.prodSmoke}invalid${SANDBOX_DOMAIN}`,
        },
        turnstileToken: "XXXX.SMOKE.TOKEN.XXXX",
        art6Consent: true,
        art9Consent: true,
        coolingOffConsent: true,
      },
    });
    expect(
      res.status(),
      `POST /api/booking returned ${res.status()} — expected 4xx (Turnstile gate proof)`,
    ).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});
