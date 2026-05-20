import type { APIRequestContext } from "@playwright/test";

import { E2E_RESET_TOKEN_FALLBACK, E2E_RESET_TOKEN_HEADER } from "../constants";

const ROUTE = "/api/e2e-reset";

function resetTokenHeaders(): Record<string, string> {
  return {
    [E2E_RESET_TOKEN_HEADER]: process.env.E2E_RESET_TOKEN ?? E2E_RESET_TOKEN_FALLBACK,
  };
}

/**
 * POST /api/e2e-reset to truncate D1 between specs. The token header travels
 * only on this call (and on /api/e2e-gift-claim-cookie via setGiftClaimCookieForTest)
 * — playwright.config.ts deliberately does NOT broadcast it on every request.
 */
export async function resetE2EDatabase(request: APIRequestContext): Promise<void> {
  await request
    .post(ROUTE, { headers: resetTokenHeaders() })
    .catch(() => undefined);
}

export { resetTokenHeaders };
