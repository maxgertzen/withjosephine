import { type FixtureSidecar, startFixtureSidecar } from "./fixtures-server";
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
}

export default async function globalSetup(): Promise<void> {
  assertEnvGuards();

  if (
    process.env.E2E_STRIPE_ROUNDTRIP === "1" ||
    process.env.E2E_GIFT_ROUNDTRIP === "1" ||
    process.env.E2E_LISTEN_ROUNDTRIP === "1"
  ) {
    console.log(
      "[e2e] remote-roundtrip mode: skipping fixture sidecar + MSW (real staging target)",
    );
    return;
  }

  const sidecar = await startFixtureSidecar();
  globalThis.__e2eSidecar = sidecar;
  process.env.SANITY_API_HOST = sidecar.url;

  mswServer.listen({ onUnhandledRequest: "warn" });
  globalThis.__e2eMsw = mswServer;


  console.log(`[e2e] sidecar on ${sidecar.url} | MSW handlers active`);
}
