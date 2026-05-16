// Single source of truth for the three staging-targeted spec flags.
// Used by playwright.config.ts, global-setup.ts, and the specs themselves
// to avoid stringly-typed drift across the same set of identifiers.

export type RoundtripFlag =
  | "E2E_STRIPE_ROUNDTRIP"
  | "E2E_GIFT_ROUNDTRIP"
  | "E2E_LISTEN_ROUNDTRIP";

export type RoundtripDescriptor = {
  flag: RoundtripFlag;
  name: "stripe-roundtrip" | "gift-roundtrip" | "listen-roundtrip";
  specMatch: RegExp;
};

export const ROUNDTRIPS: readonly RoundtripDescriptor[] = [
  {
    flag: "E2E_STRIPE_ROUNDTRIP",
    name: "stripe-roundtrip",
    specMatch: /stripe-roundtrip\.spec\.ts/,
  },
  {
    flag: "E2E_GIFT_ROUNDTRIP",
    name: "gift-roundtrip",
    specMatch: /gift-roundtrip\.spec\.ts/,
  },
  {
    flag: "E2E_LISTEN_ROUNDTRIP",
    name: "listen-roundtrip",
    specMatch: /listen-roundtrip\.spec\.ts/,
  },
] as const;

export const REMOTE_SPECS_PATTERN =
  /(stripe-roundtrip|gift-roundtrip|listen-roundtrip)\.spec\.ts/;

export function activeRoundtrip(): RoundtripDescriptor | null {
  return ROUNDTRIPS.find((r) => process.env[r.flag] === "1") ?? null;
}

export function isAnyRoundtripActive(): boolean {
  return activeRoundtrip() !== null;
}
