// Single source of truth for the round-trip spec flags.
// Used by playwright.config.ts, global-setup.ts, and the specs themselves
// to avoid stringly-typed drift across the same set of identifiers.
//
// Two families:
//   - REMOTE *_ROUNDTRIP — targets live staging worker; opt-in, manual run.
//   - LOCAL  *_LOCAL     — targets `pnpm dev` + fixture sidecar; CI-runnable.

export type RemoteRoundtripFlag =
  | "E2E_STRIPE_ROUNDTRIP"
  | "E2E_GIFT_ROUNDTRIP"
  | "E2E_LISTEN_ROUNDTRIP";

export type LocalRoundtripFlag =
  | "E2E_STRIPE_LOCAL"
  | "E2E_GIFT_LOCAL"
  | "E2E_LISTEN_LOCAL";

export type RoundtripFlag = RemoteRoundtripFlag | LocalRoundtripFlag;

export type RoundtripDescriptor = {
  flag: RoundtripFlag;
  name:
    | "stripe-roundtrip"
    | "gift-roundtrip"
    | "listen-roundtrip"
    | "stripe-local"
    | "gift-local"
    | "listen-local";
  specMatch: RegExp;
  family: "remote" | "local";
};

export const ROUNDTRIPS: readonly RoundtripDescriptor[] = [
  {
    flag: "E2E_STRIPE_ROUNDTRIP",
    name: "stripe-roundtrip",
    specMatch: /stripe-roundtrip\.spec\.ts/,
    family: "remote",
  },
  {
    flag: "E2E_GIFT_ROUNDTRIP",
    name: "gift-roundtrip",
    specMatch: /gift-roundtrip\.spec\.ts/,
    family: "remote",
  },
  {
    flag: "E2E_LISTEN_ROUNDTRIP",
    name: "listen-roundtrip",
    specMatch: /listen-roundtrip\.spec\.ts/,
    family: "remote",
  },
  {
    flag: "E2E_STRIPE_LOCAL",
    name: "stripe-local",
    specMatch: /stripe-local\.spec\.ts/,
    family: "local",
  },
  {
    flag: "E2E_GIFT_LOCAL",
    name: "gift-local",
    specMatch: /gift-local\.spec\.ts/,
    family: "local",
  },
  {
    flag: "E2E_LISTEN_LOCAL",
    name: "listen-local",
    specMatch: /listen-local\.spec\.ts/,
    family: "local",
  },
] as const;

export const REMOTE_SPECS_PATTERN =
  /(stripe-roundtrip|gift-roundtrip|listen-roundtrip)\.spec\.ts/;

export const LOCAL_ROUNDTRIP_SPECS_PATTERN =
  /(stripe-local|gift-local|listen-local)\.spec\.ts/;

export function activeRemoteRoundtrip(): RoundtripDescriptor | null {
  return (
    ROUNDTRIPS.find(
      (r) => r.family === "remote" && process.env[r.flag] === "1",
    ) ?? null
  );
}

export function activeLocalRoundtrips(): RoundtripDescriptor[] {
  return ROUNDTRIPS.filter(
    (r) => r.family === "local" && process.env[r.flag] === "1",
  );
}

export function isAnyRoundtripActive(): boolean {
  return activeRemoteRoundtrip() !== null;
}

export function isAnyLocalRoundtripActive(): boolean {
  return activeLocalRoundtrips().length > 0;
}
