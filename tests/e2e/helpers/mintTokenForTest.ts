import type { Page } from "@playwright/test";

import type { ListenTokenMintSource } from "@/lib/auth/listenToken";

interface MintTokenForTestArgs {
  page: Page;
  submissionId: string;
  recipientUserId: string;
  mintSource: ListenTokenMintSource;
  ttlMs?: number;
}

/**
 * Mint a listen token on staging via `/api/internal/test-mint-token`.
 *
 * Replaces in-process `mintListenToken` calls from spec code so the CI
 * runner no longer has to carry a synced copy of `AUTH_TOKEN_SECRET`.
 * The endpoint runs on the staging worker and signs with the worker's
 * own secret; rotating that secret only invalidates outstanding tokens,
 * never the spec's ability to mint fresh ones.
 *
 * Requires `ADMIN_API_KEY` in the test runner env (already set by the
 * `e2e-sandbox.yml` workflow). Local-dev callers should set it via
 * `.env.local` or pass through `wrangler dev` env vars.
 */
export async function mintTokenForTest({
  page,
  submissionId,
  recipientUserId,
  mintSource,
  ttlMs,
}: MintTokenForTestArgs): Promise<string> {
  const response = await page.context().request.post(
    "/api/internal/test-mint-token",
    {
      data: { submissionId, recipientUserId, mintSource, ttlMs },
      headers: {
        "content-type": "application/json",
        "x-admin-token": process.env.ADMIN_API_KEY ?? "e2e_admin_api_key_dummy",
      },
    },
  );
  if (response.status() !== 200) {
    throw new Error(
      `mintTokenForTest: endpoint returned ${response.status()} (expected 200)`,
    );
  }
  const { token } = (await response.json()) as { token: string };
  return token;
}
