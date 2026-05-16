import { defineConfig, devices } from "@playwright/test";

const isCI = Boolean(process.env.CI);
const isStripeRoundtrip = process.env.E2E_STRIPE_ROUNDTRIP === "1";
const isGiftRoundtrip = process.env.E2E_GIFT_ROUNDTRIP === "1";
const isListenRoundtrip = process.env.E2E_LISTEN_ROUNDTRIP === "1";
// True when any spec needs the staging target rather than the local dev
// server. New round-trip specs join this union without changing the rest
// of the config shape.
const isE2ERemote = isStripeRoundtrip || isGiftRoundtrip || isListenRoundtrip;
const stagingUrl =
  process.env.STAGING_URL ?? "https://staging.withjosephine.com";

// Specs that target staging directly — keep the default chromium project
// from picking them up when no flag is set.
const REMOTE_SPECS = /(stripe-roundtrip|gift-roundtrip|listen-roundtrip)\.spec\.ts/;

export default defineConfig({
  testDir: "./tests/e2e/specs",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isE2ERemote ? 1 : 2,
  reporter: isCI
    ? [["github"], ["html", { open: "never" }], ["list"]]
    : [["list"], ["html", { open: "never" }]],
  timeout: isE2ERemote ? 5 * 60 * 1000 : 60_000,
  expect: { timeout: 10_000 },
  globalTimeout: isE2ERemote ? 10 * 60 * 1000 : 6 * 60 * 1000,
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",

  use: {
    baseURL: isE2ERemote ? stagingUrl : "http://localhost:3000",
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
    : isGiftRoundtrip
      ? [
          {
            name: "gift-roundtrip",
            testMatch: /gift-roundtrip\.spec\.ts/,
            use: { ...devices["Desktop Chrome"] },
          },
        ]
      : isListenRoundtrip
        ? [
            {
              name: "listen-roundtrip",
              testMatch: /listen-roundtrip\.spec\.ts/,
              use: { ...devices["Desktop Chrome"] },
            },
          ]
        : [
            {
              name: "chromium",
              testIgnore: REMOTE_SPECS,
              use: { ...devices["Desktop Chrome"] },
            },
          ],

  webServer: isE2ERemote
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
