import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@microsoft/clarity", () => ({
  default: { consentV2: vi.fn() },
}));

import Clarity from "@microsoft/clarity";

import { clarityConsent } from "./clarity-consent";

const consentV2 = vi.mocked(Clarity.consentV2);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("clarityConsent", () => {
  it("calls Clarity.consentV2 with analytics_Storage granted when granted=true", () => {
    clarityConsent(true);
    expect(consentV2).toHaveBeenCalledWith({
      ad_Storage: "denied",
      analytics_Storage: "granted",
    });
  });

  it("calls Clarity.consentV2 with analytics_Storage denied when granted=false", () => {
    clarityConsent(false);
    expect(consentV2).toHaveBeenCalledWith({
      ad_Storage: "denied",
      analytics_Storage: "denied",
    });
  });

  it("hardcodes ad_Storage to 'denied' regardless of granted value", () => {
    clarityConsent(true);
    clarityConsent(false);
    for (const call of consentV2.mock.calls) {
      expect(call[0]?.ad_Storage).toBe("denied");
    }
  });
});
