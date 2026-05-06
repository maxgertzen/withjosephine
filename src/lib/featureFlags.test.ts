import { beforeEach, describe, expect, it, vi } from "vitest";

import { isUnderConstruction } from "./featureFlags";

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("NEXT_PUBLIC_UNDER_CONSTRUCTION", "");
});

describe("isUnderConstruction", () => {
  it("returns true when NEXT_PUBLIC_UNDER_CONSTRUCTION is '1' and no host given", () => {
    vi.stubEnv("NEXT_PUBLIC_UNDER_CONSTRUCTION", "1");
    expect(isUnderConstruction()).toBe(true);
  });

  it("returns true when NEXT_PUBLIC_UNDER_CONSTRUCTION is 'true' and no host given", () => {
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

  it("returns true on production apex when flag on", () => {
    vi.stubEnv("NEXT_PUBLIC_UNDER_CONSTRUCTION", "1");
    expect(isUnderConstruction("withjosephine.com")).toBe(true);
    expect(isUnderConstruction("www.withjosephine.com")).toBe(true);
  });

  it("returns false on preview/non-apex hosts even when flag on", () => {
    vi.stubEnv("NEXT_PUBLIC_UNDER_CONSTRUCTION", "1");
    expect(isUnderConstruction("preview.withjosephine.com")).toBe(false);
    expect(isUnderConstruction("withjosephine.maxgertzen.workers.dev")).toBe(false);
    expect(isUnderConstruction("localhost:3000")).toBe(false);
  });

  it("returns false on apex when flag is off, regardless of host", () => {
    expect(isUnderConstruction("withjosephine.com")).toBe(false);
  });
});
