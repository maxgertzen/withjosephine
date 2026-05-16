// Helpers for talking to internal staging endpoints from Playwright specs.
//
// These are intentionally thin wrappers over Playwright's `request` context
// so the spec stays declarative. The CF Access service-token headers attach
// automatically because they're set as `extraHTTPHeaders` in the test fixture.
import type { APIRequestContext } from "@playwright/test";

const REGENERATE_GIFT_CLAIM_PATH = "/api/internal/gift-claim-regenerate";

export type RegenerateGiftClaimResponse = {
  outcome: "regenerated";
  to: string;
  deliveryMethod: "self_send" | "scheduled";
  resendDispatched: boolean;
  claimUrl: string;
};

/**
 * Calls the auth-gated regenerate endpoint and returns the fresh `claimUrl`
 * issued by `issueGiftClaimToken()`. The endpoint already enforces a 5-minute
 * cooldown; the spec invokes it once per submission so the cooldown never
 * trips. `secret` is the value of the worker's `DO_DISPATCH_SECRET`.
 *
 * `pollMs` / `timeoutMs` — the endpoint returns 404 until the submission
 * exists in the lookup path (Stripe webhook → D1 → mirror lag). Poll until
 * it transitions to 200 or we timeout.
 */
export async function regenerateGiftClaim(
  request: APIRequestContext,
  submissionId: string,
  secret: string,
  options: { pollMs?: number; timeoutMs?: number } = {},
): Promise<RegenerateGiftClaimResponse> {
  const pollMs = options.pollMs ?? 3_000;
  const timeoutMs = options.timeoutMs ?? 120_000;
  const deadline = Date.now() + timeoutMs;
  let lastStatus = 0;
  let lastBody = "";
  while (Date.now() < deadline) {
    const response = await request.post(REGENERATE_GIFT_CLAIM_PATH, {
      headers: { "x-do-secret": secret, "content-type": "application/json" },
      data: { submissionId },
    });
    if (response.ok()) {
      return (await response.json()) as RegenerateGiftClaimResponse;
    }
    lastStatus = response.status();
    lastBody = await response.text();
    // 404 (submission not found yet) is the expected transient. Any other
    // status is fatal — surface immediately so the spec doesn't waste budget.
    if (lastStatus !== 404) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  throw new Error(
    `regenerateGiftClaim failed: status=${lastStatus} body=${lastBody.slice(0, 200)}`,
  );
}

