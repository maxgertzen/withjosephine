import { describe, expect, it } from "vitest";

import { CONSENT_HEADER, requiresConsent } from "./region";

describe("requiresConsent", () => {
  it("returns false when country is null (no CF header / local dev / tests)", () => {
    expect(requiresConsent(null, null)).toBe(false);
    expect(requiresConsent(null, "California")).toBe(false);
  });

  it("returns true for EU member states", () => {
    for (const code of ["DE", "FR", "IT", "ES", "NL", "PL", "IE"]) {
      expect(requiresConsent(code, null), code).toBe(true);
    }
  });

  it("returns true for EEA additions (Iceland, Liechtenstein, Norway)", () => {
    expect(requiresConsent("IS", null)).toBe(true);
    expect(requiresConsent("LI", null)).toBe(true);
    expect(requiresConsent("NO", null)).toBe(true);
  });

  it("returns true for UK and Switzerland", () => {
    expect(requiresConsent("GB", null)).toBe(true);
    expect(requiresConsent("CH", null)).toBe(true);
  });

  it("returns true for US California specifically (CCPA)", () => {
    expect(requiresConsent("US", "California")).toBe(true);
  });

  it("returns false for other US states", () => {
    expect(requiresConsent("US", "New York")).toBe(false);
    expect(requiresConsent("US", "Texas")).toBe(false);
    expect(requiresConsent("US", null)).toBe(false);
  });

  it("returns false for non-EU/non-California countries", () => {
    for (const code of ["CA", "AU", "JP", "BR", "IN", "ZA"]) {
      expect(requiresConsent(code, null), code).toBe(false);
    }
  });

  it("CONSENT_HEADER is namespaced so it doesn't collide with anything else", () => {
    expect(CONSENT_HEADER).toBe("x-josephine-consent-required");
  });
});
