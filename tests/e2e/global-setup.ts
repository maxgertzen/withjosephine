import { FIXTURE_SIDECAR_PORT } from "./fixtures-server";
import { isSandboxMode } from "./helpers/e2eMode";
import { mswServer } from "./mocks/external";

declare global {
  var __e2eMsw: typeof mswServer | undefined;
}

function assertEnvGuards(): void {
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
  if (stripeKey && !stripeKey.startsWith("sk_test_")) {
    throw new Error(
      `[e2e] STRIPE_SECRET_KEY must start with "sk_test_" (got "${stripeKey.slice(0, 8)}…"). Refusing to run against live Stripe.`,
    );
  }
}

export default async function globalSetup(): Promise<void> {
  assertEnvGuards();

  if (isSandboxMode()) {
    console.log("[e2e] sandbox mode: targeting staging — skipping fixture sidecar + MSW");
    return;
  }

  const sidecarUrl = `http://127.0.0.1:${FIXTURE_SIDECAR_PORT}`;
  if (!process.env.E2E_CAPTURE_URL) process.env.E2E_CAPTURE_URL = sidecarUrl;
  if (!process.env.STRIPE_WEBHOOK_SECRET) process.env.STRIPE_WEBHOOK_SECRET = "whsec_e2e_dummy";

  mswServer.listen({ onUnhandledRequest: "warn" });
  globalThis.__e2eMsw = mswServer;

  console.log(`[e2e] sidecar expected at ${sidecarUrl} | MSW active`);
}
