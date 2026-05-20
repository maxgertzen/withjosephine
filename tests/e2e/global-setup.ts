import { FIXTURE_SIDECAR_PORT } from "./fixtures-server";
import { isProdTarget, isSandboxMode } from "./helpers/e2eMode";
import { mswServer } from "./mocks/external";

declare global {
  var __e2eMsw: typeof mswServer | undefined;
}

const SANDBOX_REQUIRED_ENV = [
  "CF_ACCESS_CLIENT_ID",
  "CF_ACCESS_CLIENT_SECRET",
  "ADMIN_API_KEY",
  "DO_DISPATCH_SECRET",
] as const;

function assertEnvGuards(): void {
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
  if (stripeKey && !stripeKey.startsWith("sk_test_")) {
    throw new Error(
      `[e2e] STRIPE_SECRET_KEY must start with "sk_test_" (got "${stripeKey.slice(0, 8)}…"). Refusing to run against live Stripe.`,
    );
  }
}

function assertSandboxEnv(): void {
  if (isProdTarget()) return;
  const missing = SANDBOX_REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `[e2e/sandbox] refusing to run with missing env: ${missing.join(", ")}. Source .env.staging or set GH secrets.`,
    );
  }
}

export default async function globalSetup(): Promise<void> {
  assertEnvGuards();

  if (isSandboxMode()) {
    assertSandboxEnv();
    const targetLabel = isProdTarget() ? "production apex (read-only smoke)" : "staging";
    console.log(`[e2e] sandbox mode: targeting ${targetLabel} — skipping fixture sidecar + MSW`);
    return;
  }

  const sidecarUrl = `http://127.0.0.1:${FIXTURE_SIDECAR_PORT}`;
  if (!process.env.E2E_CAPTURE_URL) process.env.E2E_CAPTURE_URL = sidecarUrl;

  mswServer.listen({ onUnhandledRequest: "warn" });
  globalThis.__e2eMsw = mswServer;

  console.log(`[e2e] sidecar expected at ${sidecarUrl} | MSW active`);
}
