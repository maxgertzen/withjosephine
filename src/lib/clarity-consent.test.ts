import { afterEach, describe, expect, it, vi } from "vitest";

import { clarityConsent } from "./clarity-consent";

afterEach(() => {
  delete (window as unknown as { clarity?: unknown }).clarity;
});

describe("clarityConsent", () => {
  it("calls clarity('consentv2', {...}) with analytics_Storage granted when granted=true", () => {
    const clarityMock = vi.fn();
    (window as unknown as { clarity: typeof clarityMock }).clarity = clarityMock;
    clarityConsent(true);
    expect(clarityMock).toHaveBeenCalledWith("consentv2", {
      ad_Storage: "denied",
      analytics_Storage: "granted",
    });
  });

  it("calls clarity('consentv2', {...}) with analytics_Storage denied when granted=false", () => {
    const clarityMock = vi.fn();
    (window as unknown as { clarity: typeof clarityMock }).clarity = clarityMock;
    clarityConsent(false);
    expect(clarityMock).toHaveBeenCalledWith("consentv2", {
      ad_Storage: "denied",
      analytics_Storage: "denied",
    });
  });

  it("hardcodes ad_Storage to 'denied' regardless of granted value", () => {
    const clarityMock = vi.fn();
    (window as unknown as { clarity: typeof clarityMock }).clarity = clarityMock;
    clarityConsent(true);
    clarityConsent(false);
    for (const call of clarityMock.mock.calls) {
      const settings = call[1] as { ad_Storage: string };
      expect(settings.ad_Storage).toBe("denied");
    }
  });

  it("no-ops when window.clarity is not defined", () => {
    expect(() => clarityConsent(true)).not.toThrow();
    expect(() => clarityConsent(false)).not.toThrow();
  });
});
