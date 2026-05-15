import type { FullConfig } from "@playwright/test";

import { startFixtureSidecar, type FixtureSidecar } from "./fixtures-server";
import { mswServer } from "./mocks/external";

declare global {
  var __e2eSidecar: FixtureSidecar | undefined;
  var __e2eMsw: typeof mswServer | undefined;
}

function assertEnvGuards(): void {
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
  if (stripeKey && !stripeKey.startsWith("sk_test_")) {
    throw new Error(
      `[e2e] STRIPE_SECRET_KEY must start with "sk_test_" (got "${stripeKey.slice(0, 8)}…"). Refusing to run against live Stripe.`,
    );
  }

  const writeToken = process.env.SANITY_WRITE_TOKEN ?? "";
  if (writeToken !== "") {
    throw new Error(
      `[e2e] SANITY_WRITE_TOKEN must be empty string (got non-empty value). Refusing to run with a live write token.`,
    );
  }
}

export default async function globalSetup(_config: FullConfig): Promise<void> {
  assertEnvGuards();

  const sidecar = await startFixtureSidecar();
  globalThis.__e2eSidecar = sidecar;
  process.env.SANITY_API_HOST = sidecar.url;

  mswServer.listen({ onUnhandledRequest: "warn" });
  globalThis.__e2eMsw = mswServer;

  // eslint-disable-next-line no-console
  console.log(`[e2e] sidecar on ${sidecar.url} | MSW handlers active`);
}
