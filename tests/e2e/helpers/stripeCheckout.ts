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
