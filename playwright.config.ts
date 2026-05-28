import { randomUUID } from "node:crypto";

import { defineConfig, devices } from "@playwright/test";

import { E2E_RESET_TOKEN_FALLBACK, FIXTURE_SIDECAR_PORT } from "./tests/e2e/constants";
import {
  isProdTarget,
  isSandboxMode,
  PROD_SMOKE_PATTERN,
  SANDBOX_SPECS_PATTERN,
} from "./tests/e2e/helpers/e2eMode";

const isCI = Boolean(process.env.CI);
const isSandbox = isSandboxMode();
const isProd = isProdTarget();
const stagingUrl = process.env.STAGING_URL ?? "https://staging.withjosephine.com";
const sidecarUrl = `http://127.0.0.1:${FIXTURE_SIDECAR_PORT}`;
const sandboxPattern = isProd ? PROD_SMOKE_PATTERN : SANDBOX_SPECS_PATTERN;
const projectName = isSandbox ? (isProd ? "prod-smoke" : "sandbox") : "mock";

const e2eResetToken = process.env.E2E_RESET_TOKEN ?? E2E_RESET_TOKEN_FALLBACK;

const e2eWebhookSecret =
  process.env.STRIPE_WEBHOOK_SECRET ?? `whsec_${randomUUID().replace(/-/g, "")}`;
process.env.STRIPE_WEBHOOK_SECRET = e2eWebhookSecret;

export default defineConfig({
  testDir: "./tests/e2e/specs",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // Mock mode shares a single D1 database across workers — `/api/e2e-reset`
  // in one test's `beforeEach` truncates state mid-flight for another
  // worker. Until per-worker D1 isolation lands, serial workers are the
  // load-bearing fix for stability.
  workers: 1,
  reporter: isCI
    ? [["github"], ["html", { open: "never" }], ["list"]]
    : [["list"], ["html", { open: "never" }]],
  timeout: isSandbox ? 5 * 60 * 1000 : 60_000,
  expect: { timeout: 10_000 },
  globalTimeout: isSandbox ? 25 * 60 * 1000 : 6 * 60 * 1000,
  globalSetup: "./tests/e2e/global-setup.ts",

  use: {
    baseURL: isSandbox ? stagingUrl : "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // x-e2e-reset-token is attached only by the two helpers that need it
    // (`tests/e2e/helpers/e2eReset.ts` + `tests/e2e/helpers/giftClaimCookie.ts`),
    // not broadcast on every request.
    // Pin Chromium to a real IANA region so Intl.DateTimeFormat().resolvedOptions().timeZone
    // returns a region/city shape (matches dev machines). CI runners default to UTC, which
    // breaks IANA-shape assertions in gift-flip-to-scheduled-tz.spec.ts authored against
    // a real-browser environment.
    timezoneId: "America/Los_Angeles",
  },

  projects: [
    {
      name: projectName,
      ...(isSandbox
        ? { testMatch: sandboxPattern }
        : { testIgnore: [SANDBOX_SPECS_PATTERN, PROD_SMOKE_PATTERN] }),
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: isSandbox
    ? undefined
    : [
        {
          command: "pnpm exec tsx tests/e2e/fixture-server-cli.ts",
          url: `${sidecarUrl}/_e2e/health`,
          reuseExistingServer: !isCI,
          timeout: 30_000,
          stdout: "pipe",
          stderr: "pipe",
        },
        {
          command: "pnpm dev",
          url: "http://localhost:3000",
          reuseExistingServer: !isCI,
          timeout: 120_000,
          stdout: "pipe",
          stderr: "pipe",
          env: {
            NEXT_PUBLIC_TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
            NEXT_PUBLIC_BOOKING_TURNSTILE_BYPASS: "1",
            BOOKING_TURNSTILE_BYPASS: "1",
            E2E: "1",
            E2E_RESET_TOKEN: e2eResetToken,
            E2E_CAPTURE_URL: sidecarUrl,
            SANITY_API_HOST: sidecarUrl,
            RESEND_DRY_RUN: "1",
            SANITY_WRITE_TOKEN: "e2e_write_token_dummy",
            STRIPE_SECRET_KEY: "sk_test_e2e_dummy",
            STRIPE_WEBHOOK_SECRET: e2eWebhookSecret,
            AUTH_TOKEN_SECRET: "e2e_auth_token_secret_dummy",
            ADMIN_API_KEY: "e2e_admin_api_key_dummy",
          },
        },
      ],
});
