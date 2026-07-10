import { beforeEach, describe, expect, it, vi } from "vitest";

// Isolated file: the whole-module mock throws so the dynamic
// import("mixpanel-browser") inside initAnalytics rejects, exercising the
// chunk-load-failure guard. Kept separate from client.test.ts because that
// suite relies on a working mock shared with a statically-imported binding.
vi.mock("mixpanel-browser", () => {
  throw new Error("ChunkLoadError: Loading chunk mixpanel-browser failed");
});

import { _resetForTests, initAnalytics, isAnalyticsInitialized, trackUntyped } from "./client";

beforeEach(() => {
  _resetForTests();
  vi.unstubAllEnvs();
  vi.stubEnv("NEXT_PUBLIC_MIXPANEL_TOKEN", "test-token");
  Object.defineProperty(window, "location", {
    value: { host: "withjosephine.com" },
    configurable: true,
  });
  Object.defineProperty(window.navigator, "userAgent", {
    value: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
    configurable: true,
  });
});

describe("analytics chunk-load failure", () => {
  it("disables analytics cleanly when the mixpanel chunk fails to load (no wedge)", async () => {
    // Without the import try/catch this rejected and left mixpanelLoading true
    // forever, silently dropping every event for the rest of the session.
    await expect(initAnalytics()).resolves.toBeUndefined();
    expect(isAnalyticsInitialized()).toBe(true);
    expect(() => trackUntyped("button_click", { x: 1 })).not.toThrow();
  });
});
