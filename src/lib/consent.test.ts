import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readConsent, writeConsent } from "./consent";

const STORAGE_KEY = "josephine.consent";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("readConsent / writeConsent", () => {
  it("returns null when no choice has been written", () => {
    expect(readConsent()).toBeNull();
  });

  it("round-trips 'granted'", () => {
    writeConsent("granted");
    expect(readConsent()).toBe("granted");
  });

  it("round-trips 'declined'", () => {
    writeConsent("declined");
    expect(readConsent()).toBe("declined");
  });

  it("returns null when localStorage holds an unknown value", () => {
    window.localStorage.setItem(STORAGE_KEY, "maybe");
    expect(readConsent()).toBeNull();
  });

  it("survives a getItem that throws (private mode / blocked storage)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(readConsent()).toBeNull();
  });

  it("survives a setItem that throws (quota / blocked storage)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => writeConsent("granted")).not.toThrow();
  });
});
