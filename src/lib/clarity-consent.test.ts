import { afterEach, describe, expect, it, vi } from "vitest";

import { clarityConsent } from "./clarity-consent";

afterEach(() => {
  // Clean up the global we may have stamped on window.
  delete (window as unknown as { clarity?: unknown }).clarity;
});

describe("clarityConsent", () => {
  it("calls window.clarity('consent', true) when granted", () => {
    const clarityMock = vi.fn();
    (window as unknown as { clarity: typeof clarityMock }).clarity = clarityMock;
    clarityConsent(true);
    expect(clarityMock).toHaveBeenCalledWith("consent", true);
  });

  it("calls window.clarity('consent', false) when declined", () => {
    const clarityMock = vi.fn();
    (window as unknown as { clarity: typeof clarityMock }).clarity = clarityMock;
    clarityConsent(false);
    expect(clarityMock).toHaveBeenCalledWith("consent", false);
  });

  it("no-ops when window.clarity is not defined", () => {
    expect(() => clarityConsent(true)).not.toThrow();
  });
});
