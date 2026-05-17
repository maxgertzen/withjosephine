import { FIXTURE_SIDECAR_PORT } from "./fixtures-server";
import { isAnyRoundtripActive } from "./helpers/roundtripFlags";
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

  if (isAnyRoundtripActive()) {
    console.log(
      "[e2e] remote-roundtrip mode: skipping fixture sidecar + MSW (real staging target)",
    );
    return;
  }

  // The fixture sidecar runs as a Playwright `webServer` entry on a fixed port
  // (see playwright.config.ts) so it comes up alongside `pnpm dev`. Playwright
  // launches webServers BEFORE globalSetup, so by the time we get here the
  // sidecar is already listening — we just expose its URL to the runner
  // process so specs that POST to its capture endpoints can find it.
  const sidecarUrl = `http://127.0.0.1:${FIXTURE_SIDECAR_PORT}`;
  if (!process.env.E2E_CAPTURE_URL) {
    process.env.E2E_CAPTURE_URL = sidecarUrl;
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_e2e_dummy";
  }

  mswServer.listen({ onUnhandledRequest: "warn" });
  globalThis.__e2eMsw = mswServer;

  console.log(`[e2e] sidecar expected at ${sidecarUrl} | MSW handlers active`);
}
