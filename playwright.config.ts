import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);
const isStripeRoundtrip = process.env.E2E_STRIPE_ROUNDTRIP === "1";
const stagingUrl =
  process.env.STAGING_URL ?? "https://staging.withjosephine.com";

export default defineConfig({
  testDir: "./tests/e2e/specs",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isStripeRoundtrip ? 1 : 2,
  reporter: isCI
    ? [["github"], ["html", { open: "never" }], ["list"]]
    : [["list"], ["html", { open: "never" }]],
  timeout: isStripeRoundtrip ? 5 * 60 * 1000 : 60_000,
  expect: { timeout: 10_000 },
  globalTimeout: isStripeRoundtrip ? 10 * 60 * 1000 : 6 * 60 * 1000,
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",

  use: {
    baseURL: isStripeRoundtrip ? stagingUrl : "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: isStripeRoundtrip
    ? [
        {
          name: "stripe-roundtrip",
          testMatch: /stripe-roundtrip\.spec\.ts/,
          use: { ...devices["Desktop Chrome"] },
        },
      ]
    : [
        {
          name: "chromium",
          testIgnore: /stripe-roundtrip\.spec\.ts/,
          use: { ...devices["Desktop Chrome"] },
        },
      ],

  webServer: isStripeRoundtrip
    ? undefined
    : {
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
        },
      },
});
