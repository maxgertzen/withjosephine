import { defineConfig, devices } from "@playwright/test";

import { FIXTURE_SIDECAR_PORT } from "./tests/e2e/fixtures-server";
import {
  activeRemoteRoundtrip,
  isAnyLocalRoundtripActive,
  isAnyRoundtripActive,
  REMOTE_SPECS_PATTERN,
} from "./tests/e2e/helpers/roundtripFlags";

const isCI = Boolean(process.env.CI);
const isE2ERemote = isAnyRoundtripActive();
const isE2ELocalRoundtrip = isAnyLocalRoundtripActive();
const activeRemote = activeRemoteRoundtrip();
const stagingUrl =
  process.env.STAGING_URL ?? "https://staging.withjosephine.com";
const sidecarUrl = `http://127.0.0.1:${FIXTURE_SIDECAR_PORT}`;

const remoteProject = activeRemote && {
  name: activeRemote.name,
  testMatch: activeRemote.specMatch,
  use: { ...devices["Desktop Chrome"] },
};

const localProject = {
  name: "chromium" as const,
  testIgnore: REMOTE_SPECS_PATTERN,
  use: { ...devices["Desktop Chrome"] },
};

// Stable across config evaluations. Playwright re-evaluates playwright.config.ts
// in worker processes, so a Math.random-generated value drifts between the
// runner and the dev server. The token only needs to be unguessable to
// external probes — the route already enforces E2E=1 + ENVIRONMENT !==
// "production" gates which are the real "don't run on production" guards.
const e2eResetToken = process.env.E2E_RESET_TOKEN ?? "e2e-reset-stable-token";

export default defineConfig({
  testDir: "./tests/e2e/specs",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isE2ERemote ? 1 : isE2ELocalRoundtrip ? 1 : 2,
  reporter: isCI
    ? [["github"], ["html", { open: "never" }], ["list"]]
    : [["list"], ["html", { open: "never" }]],
  timeout: isE2ERemote ? 5 * 60 * 1000 : isE2ELocalRoundtrip ? 3 * 60 * 1000 : 60_000,
  expect: { timeout: 10_000 },
  globalTimeout: isE2ERemote
    ? 10 * 60 * 1000
    : isE2ELocalRoundtrip
      ? 10 * 60 * 1000
      : 6 * 60 * 1000,
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",

  use: {
    baseURL: isE2ERemote ? stagingUrl : "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    extraHTTPHeaders: isE2ERemote
      ? undefined
      : { "x-e2e-reset-token": e2eResetToken },
  },

  projects: remoteProject ? [remoteProject] : [localProject],

  webServer: isE2ERemote
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
            STRIPE_WEBHOOK_SECRET: "whsec_e2e_dummy",
            LISTEN_TOKEN_SECRET: "e2e_listen_token_secret_dummy",
            ADMIN_API_KEY: "e2e_admin_api_key_dummy",
          },
        },
      ],
});
