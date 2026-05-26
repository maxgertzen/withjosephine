import type { Page } from "@playwright/test";

/**
 * Drives the step-up OTP modal in mock-mode e2e specs.
 *
 * Phase 3 of the one-tap epic gates edit-recipient + send-now + (future)
 * claim-for-yourself mutations behind a 10-min elevation TTL on the listen
 * session. When the spec triggers one of these mutations without elevation,
 * the GiftCardActions surface opens StepUpOtpModal, which:
 *   1. Auto-POSTs `/api/auth/step-up/request` on mount
 *   2. In mock mode RESEND_DRY_RUN=1 is set, so the worker skips the actual
 *      email send and surfaces `devCode` on the response
 *   3. The spec reads `devCode`, fills the input, submits, and the original
 *      mutation retries automatically
 *
 * Usage:
 *   await page.getByRole("button", { name: /send now/i }).click();
 *   await completeStepUpOtp(page);
 *   // mutation has now retried; assert downstream side effects
 */
export async function completeStepUpOtp(page: Page): Promise<void> {
  // The request response carries `devCode` because RESEND_DRY_RUN=1 in mock
  // mode causes the sender to short-circuit with kind:"skipped", which the
  // route handler then surfaces as { devCode }.
  const requestResponse = await page.waitForResponse(
    (res) => res.url().endsWith("/api/auth/step-up/request") && res.status() === 200,
    { timeout: 10_000 },
  );
  const body = (await requestResponse.json()) as { devCode?: string };
  if (!body.devCode) {
    throw new Error(
      "completeStepUpOtp: expected `devCode` on /api/auth/step-up/request response in mock mode, got: " +
        JSON.stringify(body),
    );
  }

  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible", timeout: 5_000 });

  await page.getByLabel("6 digit code").fill(body.devCode);
  await page.getByRole("button", { name: /^verify$/i }).click();

  await dialog.waitFor({ state: "detached", timeout: 10_000 });
}
