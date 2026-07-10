import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@microsoft/clarity", () => ({
  default: { init: vi.fn(), consentV2: vi.fn() },
}));

vi.mock("@/lib/clarity-consent", () => ({
  clarityConsent: vi.fn(),
}));

import Clarity from "@microsoft/clarity";

import { clarityConsent } from "@/lib/clarity-consent";

import { ClarityScript } from "./ClarityScript";

const init = vi.mocked(Clarity.init);
const mockClarityConsent = vi.mocked(clarityConsent);

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  // Some dev shells export NEXT_PUBLIC_TRACK_NON_PROD=1 which vitest inherits —
  // clear so non-prod-gate tests run against the default (gate closed).
  vi.stubEnv("NEXT_PUBLIC_TRACK_NON_PROD", "");
  Object.defineProperty(window, "location", {
    value: { host: "withjosephine.com" },
    configurable: true,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ClarityScript", () => {
  it("initializes Clarity then signals consent on production host", () => {
    vi.stubEnv("NEXT_PUBLIC_CLARITY_PROJECT_ID", "abc123def4");
    const { container } = render(<ClarityScript />);
    expect(init).toHaveBeenCalledWith("abc123def4");
    expect(mockClarityConsent).toHaveBeenCalledWith(true);
    expect(init.mock.invocationCallOrder[0]).toBeLessThan(
      mockClarityConsent.mock.invocationCallOrder[0],
    );
    expect(container.firstChild).toBeNull();
  });

  it("does not initialize when the project ID env var is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_CLARITY_PROJECT_ID", "");
    render(<ClarityScript />);
    expect(init).not.toHaveBeenCalled();
    expect(mockClarityConsent).not.toHaveBeenCalled();
  });

  it("does not initialize on non-production host without TRACK_NON_PROD", () => {
    vi.stubEnv("NEXT_PUBLIC_CLARITY_PROJECT_ID", "abc123def4");
    Object.defineProperty(window, "location", {
      value: { host: "staging.withjosephine.com" },
      configurable: true,
    });
    render(<ClarityScript />);
    expect(init).not.toHaveBeenCalled();
  });

  it("initializes on non-production host when TRACK_NON_PROD=1", () => {
    vi.stubEnv("NEXT_PUBLIC_CLARITY_PROJECT_ID", "abc123def4");
    vi.stubEnv("NEXT_PUBLIC_TRACK_NON_PROD", "1");
    Object.defineProperty(window, "location", {
      value: { host: "staging.withjosephine.com" },
      configurable: true,
    });
    render(<ClarityScript />);
    expect(init).toHaveBeenCalledWith("abc123def4");
  });
});
