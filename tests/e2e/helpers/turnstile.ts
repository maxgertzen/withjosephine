import type { Page } from "@playwright/test";

export async function waitForTurnstileToken(page: Page, timeoutMs = 15_000): Promise<void> {
  await page.waitForFunction(
    () => {
      const inputs = document.querySelectorAll('input[name="cf-turnstile-response"]');
      for (const input of inputs) {
        if ((input as HTMLInputElement).value.length > 0) return true;
      }
      return false;
    },
    { timeout: timeoutMs },
  );
}
