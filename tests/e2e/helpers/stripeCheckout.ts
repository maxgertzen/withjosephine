import type { Page } from "@playwright/test";

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
  getSessionId(): string | null;
  getSubmissionId(): string | null;
}

export async function interceptStripeCheckout(
  page: Page,
  { readingSlug, gift = false }: InterceptArgs,
): Promise<StripeCheckoutIntercept> {
  let sessionId: string | null = null;
  let submissionId: string | null = null;

  await page.route("https://buy.stripe.com/**", async (route) => {
    const url = new URL(route.request().url());
    submissionId = url.searchParams.get("client_reference_id") ?? "";
    sessionId = `cs_test_${crypto.randomUUID().slice(0, 8)}`;
    const query = new URLSearchParams();
    if (gift) query.set("gift", "1");
    query.set("sessionId", sessionId);
    query.set("submission", submissionId);
    await route.fulfill({
      status: 303,
      headers: { location: `/thank-you/${readingSlug}?${query.toString()}` },
    });
  });

  return {
    getSessionId: () => sessionId,
    getSubmissionId: () => submissionId,
  };
}
