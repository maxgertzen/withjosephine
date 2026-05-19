import type { Page, Route } from "@playwright/test";

const SANDBOX_CARD = "4242 4242 4242 4242";
const SANDBOX_EXPIRY = "12 / 34";
const SANDBOX_CVC = "123";
const SANDBOX_ZIP = "12345";
const SANDBOX_NAME = "Ada Lovelace";

export async function fillStripeCheckout(
  page: Page,
  email: string,
): Promise<void> {
  await page.waitForURL(/checkout\.stripe\.com|buy\.stripe\.com/, {
    timeout: 30_000,
  });
  await page.locator('input[name="email"]').first().fill(email);
  await page.locator('input[name="cardNumber"]').fill(SANDBOX_CARD);
  await page.locator('input[name="cardExpiry"]').fill(SANDBOX_EXPIRY);
  await page.locator('input[name="cardCvc"]').fill(SANDBOX_CVC);
  const zip = page.locator('input[name="billingPostalCode"]');
  if (await zip.count()) await zip.fill(SANDBOX_ZIP);
  const cardName = page.locator('input[name="billingName"]');
  if (await cardName.count()) await cardName.fill(SANDBOX_NAME);
  await page.getByTestId("hosted-payment-submit-button").click();
}

interface InterceptArgs {
  readingSlug: string;
  gift?: boolean;
}

export interface StripeCheckoutIntercept {
  /** Resolves once buy.stripe.com is hit and the 303 is fulfilled. */
  readonly captured: Promise<{ sessionId: string; submissionId: string }>;
  /** Removes the route handler. Call in afterEach when the same Page outlives one test. */
  unroute(): Promise<void>;
}

const STRIPE_BUY_GLOB = "https://buy.stripe.com/**";

export async function interceptStripeCheckout(
  page: Page,
  { readingSlug, gift = false }: InterceptArgs,
): Promise<StripeCheckoutIntercept> {
  let resolveCapture!: (value: { sessionId: string; submissionId: string }) => void;
  const captured = new Promise<{ sessionId: string; submissionId: string }>(
    (resolve) => {
      resolveCapture = resolve;
    },
  );

  const handler = async (route: Route) => {
    const url = new URL(route.request().url());
    const submissionId = url.searchParams.get("client_reference_id") ?? "";
    const sessionId = `cs_test_${crypto.randomUUID().slice(0, 8)}`;
    const query = new URLSearchParams();
    if (gift) query.set("gift", "1");
    query.set("sessionId", sessionId);
    query.set("submission", submissionId);
    await route.fulfill({
      status: 303,
      headers: { location: `/thank-you/${readingSlug}?${query.toString()}` },
    });
    resolveCapture({ sessionId, submissionId });
  };

  await page.route(STRIPE_BUY_GLOB, handler);

  return {
    captured,
    unroute: () => page.unroute(STRIPE_BUY_GLOB, handler),
  };
}
