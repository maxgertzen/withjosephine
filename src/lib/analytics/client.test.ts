import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("mixpanel-browser", () => {
  const init = vi.fn();
  const track = vi.fn();
  const register = vi.fn();
  const identify = vi.fn();
  return {
    default: { init, track, register, identify },
  };
});

import mixpanel from "mixpanel-browser";

import {
  _resetForTests,
  identifySubmission,
  initAnalytics,
  isAnalyticsInitialized,
  track,
} from "./client";

const TOKEN = "test-token";

beforeEach(() => {
  _resetForTests();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.stubEnv("NEXT_PUBLIC_MIXPANEL_TOKEN", TOKEN);
  // jsdom's default UA doesn't match the headless regex; explicit set
  // makes the test robust against future jsdom updates.
  Object.defineProperty(window.navigator, "userAgent", {
    value: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
    configurable: true,
  });
});

afterEach(() => {
  _resetForTests();
});

describe("initAnalytics", () => {
  it("calls mixpanel.init with the token + workerd-friendly options", () => {
    initAnalytics();
    expect(mixpanel.init).toHaveBeenCalledTimes(1);
    expect(mixpanel.init).toHaveBeenCalledWith(
      TOKEN,
      expect.objectContaining({
        track_pageview: false,
        ip: false,
        persistence: "localStorage",
      }),
    );
    expect(isAnalyticsInitialized()).toBe(true);
  });

  it("registers environment super property based on hostname", () => {
    Object.defineProperty(window, "location", {
      value: { host: "withjosephine.com" },
      configurable: true,
    });
    initAnalytics();
    expect(mixpanel.register).toHaveBeenCalledWith(
      expect.objectContaining({ environment: "production", site_host: "withjosephine.com" }),
    );
  });

  it("tags preview hosts as environment=preview", () => {
    Object.defineProperty(window, "location", {
      value: { host: "preview.withjosephine.com" },
      configurable: true,
    });
    initAnalytics();
    expect(mixpanel.register).toHaveBeenCalledWith(
      expect.objectContaining({ environment: "preview" }),
    );
  });

  it("tags workers.dev hosts as environment=workers-dev", () => {
    Object.defineProperty(window, "location", {
      value: { host: "withjosephine.maxgertzen.workers.dev" },
      configurable: true,
    });
    initAnalytics();
    expect(mixpanel.register).toHaveBeenCalledWith(
      expect.objectContaining({ environment: "workers-dev" }),
    );
  });

  it("tags everything else as environment=local", () => {
    Object.defineProperty(window, "location", {
      value: { host: "localhost:3000" },
      configurable: true,
    });
    initAnalytics();
    expect(mixpanel.register).toHaveBeenCalledWith(
      expect.objectContaining({ environment: "local" }),
    );
  });

  it("registers $ignore=true when user agent matches the headless pattern", () => {
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0 (HeadlessChrome) Chrome/120.0",
      configurable: true,
    });
    initAnalytics();
    expect(mixpanel.register).toHaveBeenCalledWith({ $ignore: true });
  });

  it.each(["Lighthouse", "PhantomJS", "Puppeteer", "Playwright"])(
    "registers $ignore=true for %s user agent",
    (uaSubstring) => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: `Mozilla/5.0 ${uaSubstring}/1.0`,
        configurable: true,
      });
      initAnalytics();
      const ignoreCall = vi
        .mocked(mixpanel.register)
        .mock.calls.find(([arg]) => (arg as Record<string, unknown>).$ignore === true);
      expect(ignoreCall, `expected $ignore call for UA matching ${uaSubstring}`).toBeDefined();
    },
  );

  it("does NOT register $ignore for normal browser UAs", () => {
    initAnalytics();
    const ignoreCall = vi
      .mocked(mixpanel.register)
      .mock.calls.find(([arg]) => (arg as Record<string, unknown>).$ignore === true);
    expect(ignoreCall).toBeUndefined();
  });

  it("is idempotent — second call no-ops", () => {
    initAnalytics();
    initAnalytics();
    expect(mixpanel.init).toHaveBeenCalledTimes(1);
  });

  it("no-ops when NEXT_PUBLIC_MIXPANEL_TOKEN is unset (still marks initialized so queue drains)", () => {
    vi.stubEnv("NEXT_PUBLIC_MIXPANEL_TOKEN", "");
    initAnalytics();
    expect(mixpanel.init).not.toHaveBeenCalled();
    expect(isAnalyticsInitialized()).toBe(true);
  });
});

describe("track buffer", () => {
  it("queues events fired before init and flushes them on init", () => {
    track("entry_page_view", {
      reading_id: "soul-blueprint",
      referrer: "",
      viewport_width: 1024,
    });
    track("cta_click_intake", {
      reading_id: "soul-blueprint",
      position: "verso-cta",
    });
    expect(mixpanel.track).not.toHaveBeenCalled();

    initAnalytics();

    expect(mixpanel.track).toHaveBeenCalledTimes(2);
    expect(mixpanel.track).toHaveBeenNthCalledWith(
      1,
      "entry_page_view",
      expect.objectContaining({ reading_id: "soul-blueprint" }),
    );
    expect(mixpanel.track).toHaveBeenNthCalledWith(
      2,
      "cta_click_intake",
      expect.objectContaining({ position: "verso-cta" }),
    );
  });

  it("after init, track() forwards directly to mixpanel.track", () => {
    initAnalytics();
    track("intake_save_click", { reading_id: "akashic-record", page_number: 2 });
    expect(mixpanel.track).toHaveBeenCalledWith("intake_save_click", {
      reading_id: "akashic-record",
      page_number: 2,
    });
  });

  it("drops the buffer (no-ops on flush) when token is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_MIXPANEL_TOKEN", "");
    track("entry_page_view", {
      reading_id: "soul-blueprint",
      referrer: "",
      viewport_width: 1024,
    });
    initAnalytics();
    expect(mixpanel.track).not.toHaveBeenCalled();
  });
});

describe("identifySubmission", () => {
  it("calls mixpanel.identify with the submission UUID once initialized", () => {
    initAnalytics();
    identifySubmission("sub_test_abc123");
    expect(mixpanel.identify).toHaveBeenCalledWith("sub_test_abc123");
  });

  it("no-ops before init (we never call it before submit_success in practice)", () => {
    identifySubmission("sub_test_abc123");
    expect(mixpanel.identify).not.toHaveBeenCalled();
  });
});
