import { spawnSync } from "node:child_process";

import { FIXTURE_SIDECAR_PORT } from "./constants";
import { isProdTarget, isSandboxMode } from "./helpers/e2eMode";

const SANDBOX_REQUIRED_ENV = [
  "CF_ACCESS_CLIENT_ID",
  "CF_ACCESS_CLIENT_SECRET",
  "ADMIN_API_KEY",
  "DO_DISPATCH_SECRET",
] as const;

function assertWranglerAuthenticated(): void {
  // Sandbox specs invoke wrangler at cleanup time (D1 truncate). If wrangler
  // isn't authenticated we want a single clear failure here rather than 14
  // spec-level "wrangler login required" errors mid-suite.
  if (isProdTarget()) return;
  const result = spawnSync("pnpm", ["exec", "wrangler", "whoami"], {
    encoding: "utf8",
    timeout: 15_000,
  });
  if (result.status !== 0) {
    throw new Error(
      `[e2e/sandbox] wrangler whoami failed (exit ${result.status}). Run 'pnpm exec wrangler login' locally, or set CLOUDFLARE_API_TOKEN in the runner env.\n${(result.stderr || result.stdout || "").trim()}`,
    );
  }
  const expectedAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (expectedAccount && !result.stdout.includes(expectedAccount)) {
    throw new Error(
      `[e2e/sandbox] wrangler authenticated to a different account than CLOUDFLARE_ACCOUNT_ID expects. Refusing to run sandbox specs against the wrong account.`,
    );
  }
}

function assertEnvGuards(): void {
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? "";
  if (stripeKey && !stripeKey.startsWith("sk_test_")) {
    throw new Error(
      `[e2e] STRIPE_SECRET_KEY must start with "sk_test_" (got "${stripeKey.slice(0, 8)}…"). Refusing to run against live Stripe.`,
    );
  }
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  if (webhookSecret && !webhookSecret.startsWith("whsec_")) {
    throw new Error(
      `[e2e] STRIPE_WEBHOOK_SECRET must start with "whsec_" (got "${webhookSecret.slice(0, 8)}…"). Stripe.webhooks.constructEvent will reject anything else.`,
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
    assertWranglerAuthenticated();
    const targetLabel = isProdTarget() ? "production apex (read-only smoke)" : "staging";
    console.log(`[e2e] sandbox mode: targeting ${targetLabel} — skipping fixture sidecar`);
    return;
  }

  const sidecarUrl = `http://127.0.0.1:${FIXTURE_SIDECAR_PORT}`;
  if (!process.env.E2E_CAPTURE_URL) process.env.E2E_CAPTURE_URL = sidecarUrl;

  console.log(`[e2e] sidecar expected at ${sidecarUrl}`);
}
