export const SANDBOX_SPECS_PATTERN = /-roundtrip\.spec\.ts$/;
export const PROD_SMOKE_PATTERN = /-readonly-smoke\.spec\.ts$/;

export function isSandboxMode(): boolean {
  return process.env.E2E_SANDBOX === "1";
}

export function isProdTarget(): boolean {
  const stagingUrl = process.env.STAGING_URL ?? "";
  return stagingUrl === "https://withjosephine.com";
}
