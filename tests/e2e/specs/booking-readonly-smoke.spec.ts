import { expect, test } from "@playwright/test";
import { createClient } from "@sanity/client";

import { SANDBOX_DOMAIN, SANDBOX_EMAIL_PREFIXES } from "@/lib/booking/sandboxEmails";

// A buy.stripe.com link that is NOT test-mode (test links carry a `test_` path
// segment). Asserting this guards the Stripe live-mode cutover: a test link
// surviving to launch fails the smoke instead of passing green.
const STRIPE_LIVE_BUY_URL = /^https:\/\/buy\.stripe\.com\/(?!test_)[A-Za-z0-9_-]+/;

const APEX_UNPARKED = process.env.APEX_UNPARKED === "true";

const READINGS = [
  { slug: "birth-chart", needle: "birth chart" },
  { slug: "soul-blueprint", needle: "soul blueprint" },
  { slug: "akashic-record", needle: "akashic" },
] as const;

const PUBLIC_PAGES = [
  { path: "/", needle: "josephine" },
  { path: "/privacy", needle: "privacy" },
  { path: "/terms", needle: "terms" },
  { path: "/refund-policy", needle: "refund" },
] as const;

test.describe.configure({ mode: "parallel" });

test.describe("Prod read-only public smoke", () => {
  test.skip(!APEX_UNPARKED, "Apex parked — smoke specs gated behind APEX_UNPARKED=true");

  for (const { path, needle } of PUBLIC_PAGES) {
    test(`${path} renders public content`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status(), `GET ${path} should return 200`).toBe(200);
      expect(
        (await res.text()).toLowerCase(),
        `${path} should render real content referencing "${needle}"`,
      ).toContain(needle);
    });
  }

  for (const { slug, needle } of READINGS) {
    test(`/book/${slug} renders entry page + letter CTA`, async ({ request }) => {
      const res = await request.get(`/book/${slug}`);
      expect(res.status(), `GET /book/${slug} should return 200`).toBe(200);
      const html = await res.text();
      expect(
        html.toLowerCase(),
        `entry page should reference the ${slug} reading`,
      ).toContain(needle);
      expect(
        html,
        "entry page should carry the /letter CTA href (RSC + Sanity composed)",
      ).toContain(`/book/${slug}/letter`);
    });
  }

  test("unknown path returns a 404", async ({ request }) => {
    const res = await request.get("/this-route-does-not-exist-prod-smoke");
    expect(res.status(), "unknown path should 404 once unparked").toBe(404);
  });

  test("robots.txt is served as plain text", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status(), "GET /robots.txt should return 200").toBe(200);
    expect(res.headers()["content-type"] ?? "").toContain("text/plain");
  });

  test("every reading carries a live-mode stripePaymentLink in prod CMS", async () => {
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
    const rows = await client.fetch<{ slug: string | null; link: string | null }[]>(
      `*[_type=="reading"]{ "slug": slug.current, "link": stripePaymentLink }`,
    );
    for (const { slug } of READINGS) {
      const row = rows.find((r) => r.slug === slug);
      expect(row?.link, `reading "${slug}" must have a payment link in prod CMS`).toBeTruthy();
      expect(
        row!.link!,
        `reading "${slug}" payment link must be LIVE-mode (no test_ segment)`,
      ).toMatch(STRIPE_LIVE_BUY_URL);
    }
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

  test("/api/contact gate rejects dummy Turnstile token with 4xx", async ({ request }) => {
    const res = await request.post("/api/contact", {
      data: {
        name: "Prod Smoke",
        email: `${SANDBOX_EMAIL_PREFIXES.prodSmoke}contact${SANDBOX_DOMAIN}`,
        message: "read-only prod smoke gate check",
        turnstileToken: "XXXX.SMOKE.TOKEN.XXXX",
      },
    });
    expect(
      res.status(),
      `POST /api/contact returned ${res.status()} — expected 4xx (Turnstile gate proof)`,
    ).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });
});
