// Single source of truth for e2e port, fallback dummy tokens, and the
// timeout buckets specs reach for. Specs should import from here rather
// than re-declaring magic numbers / dummy strings inline.

export const FIXTURE_SIDECAR_PORT = 47391;

export const E2E_RESET_TOKEN_FALLBACK = "e2e-reset-stable-token";
export const E2E_ADMIN_API_KEY_FALLBACK = "e2e_admin_api_key_dummy";

export const E2E_RESET_TOKEN_HEADER = "x-e2e-reset-token";

export const TIMEOUTS = {
  capture: 5_000,
  expect: 10_000,
  action: 15_000,
  navigation: 30_000,
  test: 60_000,
  testLong: 2 * 60_000,
  testExtraLong: 3 * 60_000,
} as const;
