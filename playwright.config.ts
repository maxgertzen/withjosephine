import { defineConfig, devices } from "@playwright/test";

import {
  activeRoundtrip,
  isAnyRoundtripActive,
  REMOTE_SPECS_PATTERN,
} from "./tests/e2e/helpers/roundtripFlags";

const isCI = Boolean(process.env.CI);
const isE2ERemote = isAnyRoundtripActive();
const active = activeRoundtrip();
const stagingUrl =
  process.env.STAGING_URL ?? "https://staging.withjosephine.com";

const remoteProject = active && {
  name: active.name,
  testMatch: active.specMatch,
  use: { ...devices["Desktop Chrome"] },
};

const localProject = {
  name: "chromium" as const,
  testIgnore: REMOTE_SPECS_PATTERN,
  use: { ...devices["Desktop Chrome"] },
};

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

  projects: remoteProject ? [remoteProject] : [localProject],

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
