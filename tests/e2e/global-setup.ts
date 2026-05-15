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

  const sidecar = await startFixtureSidecar();
  globalThis.__e2eSidecar = sidecar;
  // SANITY_API_HOST is the actual protection — every Sanity request gets routed
  // to the sidecar regardless of token value. Even if SANITY_WRITE_TOKEN is set
  // in the local environment, writes hit the sidecar (which 404s on POST).
  process.env.SANITY_API_HOST = sidecar.url;

  mswServer.listen({ onUnhandledRequest: "warn" });
  globalThis.__e2eMsw = mswServer;

   
  console.log(`[e2e] sidecar on ${sidecar.url} | MSW handlers active`);
}
