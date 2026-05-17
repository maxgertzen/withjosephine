export const SANDBOX_SPECS_PATTERN = /-roundtrip\.spec\.ts$/;

export function isSandboxMode(): boolean {
  return process.env.E2E_SANDBOX === "1";
}
