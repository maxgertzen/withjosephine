export const SANDBOX_DOMAIN = "@withjosephine.com" as const;

export const SANDBOX_EMAIL_PREFIXES = {
  listenRoundtrip: "listen-roundtrip+",
  stripeRoundtrip: "stripe-roundtrip+",
  v120Qa: "v120-qa+",
  listenOneTap: "listen-one-tap+",
  prodSmoke: "prod-smoke+",
} as const;

export type SandboxEmailPrefix = (typeof SANDBOX_EMAIL_PREFIXES)[keyof typeof SANDBOX_EMAIL_PREFIXES];

export const SANDBOX_EMAIL_PREFIX_LIST: readonly SandboxEmailPrefix[] =
  Object.values(SANDBOX_EMAIL_PREFIXES);

export function isSandboxEmail(address: string | null | undefined): boolean {
  if (!address) return false;
  const lower = address.toLowerCase();
  if (!lower.endsWith(SANDBOX_DOMAIN)) return false;
  return SANDBOX_EMAIL_PREFIX_LIST.some((prefix) => lower.startsWith(prefix));
}
