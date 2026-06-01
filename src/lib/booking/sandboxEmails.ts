// Source of truth for sandbox-email recognition. resend.tsx uses the prefix
// list at runtime to fail-closed on cron/webhook/DO send paths that bypass
// the X-E2E-Resend-DryRun request header; Playwright specs import the same
// constants so a typo or rename surfaces at TypeScript compile time instead
// of silently re-opening the Resend quota leak.

export const SANDBOX_DOMAIN = "@withjosephine.com" as const;

export const SANDBOX_EMAIL_PREFIXES = {
  giftRoundtripPurchaser: "gift-roundtrip-purchaser+",
  giftRoundtripRecipient: "gift-roundtrip-recipient+",
  giftRecipientListenPurchaser: "gift-recipient-listen-purchaser+",
  giftRecipientListenRecipient: "gift-recipient-listen-recipient+",
  listenRoundtrip: "listen-roundtrip+",
  stripeRoundtrip: "stripe-roundtrip+",
  v120Qa: "v120-qa+",
  libraryOneTap: "library-one-tap+",
  listenOneTap: "listen-one-tap+",
  prodSmoke: "prod-smoke+",
  newDeviceNotice: "new-device-notice+",
} as const;

export type SandboxEmailPrefix = (typeof SANDBOX_EMAIL_PREFIXES)[keyof typeof SANDBOX_EMAIL_PREFIXES];

export const SANDBOX_EMAIL_PREFIX_LIST: readonly SandboxEmailPrefix[] =
  Object.values(SANDBOX_EMAIL_PREFIXES);
