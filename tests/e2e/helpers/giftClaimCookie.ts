import type { APIRequestContext } from "@playwright/test";

const E2E_GIFT_CLAIM_ROUTE = "/api/e2e-gift-claim-cookie";

export async function setGiftClaimCookieForTest(
  request: APIRequestContext,
  submissionId: string,
): Promise<void> {
  const response = await request.post(E2E_GIFT_CLAIM_ROUTE, {
    data: { submissionId },
    headers: { "content-type": "application/json" },
  });
  if (!response.ok()) {
    throw new Error(
      `[setGiftClaimCookieForTest] ${response.status()} ${response.statusText()}`,
    );
  }
}
