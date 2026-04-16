import { describe, it, expect, vi, beforeEach } from "vitest";
import { isUnderConstruction, isAnalyticsEnabled } from "./featureFlags";

beforeEach(() => {
  vi.unstubAllEnvs();
});

describe("isUnderConstruction", () => {
  it("returns true when NEXT_PUBLIC_UNDER_CONSTRUCTION is '1'", () => {
    vi.stubEnv("NEXT_PUBLIC_UNDER_CONSTRUCTION", "1");
    expect(isUnderConstruction()).toBe(true);
  });

  it("returns true when NEXT_PUBLIC_UNDER_CONSTRUCTION is 'true'", () => {
    vi.stubEnv("NEXT_PUBLIC_UNDER_CONSTRUCTION", "true");
    expect(isUnderConstruction()).toBe(true);
  });

  it("returns false when not set", () => {
    expect(isUnderConstruction()).toBe(false);
  });

  it("returns false when set to '0'", () => {
    vi.stubEnv("NEXT_PUBLIC_UNDER_CONSTRUCTION", "0");
    expect(isUnderConstruction()).toBe(false);
  });
});

describe("isAnalyticsEnabled", () => {
  it("returns true when NEXT_PUBLIC_CF_ANALYTICS_TOKEN is set", () => {
    vi.stubEnv("NEXT_PUBLIC_CF_ANALYTICS_TOKEN", "abc123");
    expect(isAnalyticsEnabled()).toBe(true);
  });

  it("returns false when not set", () => {
    expect(isAnalyticsEnabled()).toBe(false);
  });

  it("returns false when empty string", () => {
    vi.stubEnv("NEXT_PUBLIC_CF_ANALYTICS_TOKEN", "");
    expect(isAnalyticsEnabled()).toBe(false);
  });
});
