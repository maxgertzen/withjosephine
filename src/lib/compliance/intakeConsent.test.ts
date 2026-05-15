import { describe, expect, it } from "vitest";

import {
  ART6_CONSENT_LABEL,
  ART9_CONSENT_LABEL,
  COOLING_OFF_CONSENT_LABEL,
  emptyConsentSnapshot,
  isFullyConsented,
  type LegalConsentSnapshot,
} from "./intakeConsent";

function snapshot(overrides: {
  art6?: boolean;
  art9?: boolean;
  coolingOff?: boolean;
}): LegalConsentSnapshot {
  const base = emptyConsentSnapshot();
  if (overrides.art6 !== undefined) base.art6.acknowledged = overrides.art6;
  if (overrides.art9 !== undefined) base.art9.acknowledged = overrides.art9;
  if (overrides.coolingOff !== undefined)
    base.coolingOff.acknowledged = overrides.coolingOff;
  return base;
}

describe("emptyConsentSnapshot", () => {
  it("seeds all acks as unchecked with the locked label text", () => {
    const s = emptyConsentSnapshot();
    expect(s.art6).toEqual({ acknowledged: false, labelText: ART6_CONSENT_LABEL });
    expect(s.art9).toEqual({ acknowledged: false, labelText: ART9_CONSENT_LABEL });
    expect(s.coolingOff).toEqual({
      acknowledged: false,
      labelText: COOLING_OFF_CONSENT_LABEL,
    });
  });
});

describe("isFullyConsented (requireArt9: true)", () => {
  it.each([
    { case: "none acknowledged", overrides: {}, expected: false },
    {
      case: "only art6",
      overrides: { art6: true },
      expected: false,
    },
    {
      case: "art6 + art9 but no cooling-off",
      overrides: { art6: true, art9: true },
      expected: false,
    },
    {
      case: "art6 + cooling-off but no art9",
      overrides: { art6: true, coolingOff: true },
      expected: false,
    },
    {
      case: "art9 + cooling-off but no art6",
      overrides: { art9: true, coolingOff: true },
      expected: false,
    },
    {
      case: "all three acknowledged",
      overrides: { art6: true, art9: true, coolingOff: true },
      expected: true,
    },
  ])("$case → $expected", ({ overrides, expected }) => {
    expect(isFullyConsented(snapshot(overrides), true)).toBe(expected);
  });
});

describe("isFullyConsented (requireArt9: false)", () => {
  it.each([
    { case: "none acknowledged", overrides: {}, expected: false },
    {
      case: "only art6",
      overrides: { art6: true },
      expected: false,
    },
    {
      case: "art6 + cooling-off, no art9",
      overrides: { art6: true, coolingOff: true },
      expected: true,
    },
    {
      case: "art6 + cooling-off + art9 (all three)",
      overrides: { art6: true, art9: true, coolingOff: true },
      expected: true,
    },
    {
      case: "art9 + cooling-off, no art6",
      overrides: { art9: true, coolingOff: true },
      expected: false,
    },
    {
      case: "art6 only (no cooling-off)",
      overrides: { art6: true, art9: true },
      expected: false,
    },
  ])("$case → $expected", ({ overrides, expected }) => {
    expect(isFullyConsented(snapshot(overrides), false)).toBe(expected);
  });
});
