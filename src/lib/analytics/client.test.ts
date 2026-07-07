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
  trackThrottled,
  trackUntyped,
} from "./client";

const TOKEN = "test-token";

beforeEach(() => {
  _resetForTests();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  // Dev shells may export NEXT_PUBLIC_TRACK_NON_PROD=1; the non-prod
  // opt-in gate tests below assume the gate is closed by default. Explicit
  // stub to clear any inherited shell value.
  vi.stubEnv("NEXT_PUBLIC_TRACK_NON_PROD", "");
  vi.stubEnv("NEXT_PUBLIC_MIXPANEL_TOKEN", TOKEN);
  // Default to a production host so init runs in tests by default; the
  // non-prod-opt-in gate has dedicated tests below.
  Object.defineProperty(window, "location", {
    value: { host: "withjosephine.com" },
    configurable: true,
  });
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
  it("calls mixpanel.init with the token + workerd-friendly options", async () => {
    await initAnalytics();
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

  it("registers environment super property based on hostname", async () => {
    Object.defineProperty(window, "location", {
      value: { host: "withjosephine.com" },
      configurable: true,
    });
    await initAnalytics();
    expect(mixpanel.register).toHaveBeenCalledWith(
      expect.objectContaining({ environment: "production", site_host: "withjosephine.com" }),
    );
  });

  it("tags preview hosts as environment=preview (when opted in)", async () => {
    Object.defineProperty(window, "location", {
      value: { host: "preview.withjosephine.com" },
      configurable: true,
    });
    vi.stubEnv("NEXT_PUBLIC_TRACK_NON_PROD", "1");
    await initAnalytics();
    expect(mixpanel.register).toHaveBeenCalledWith(
      expect.objectContaining({ environment: "preview" }),
    );
  });

  it("tags workers.dev hosts as environment=workers-dev (when opted in)", async () => {
    Object.defineProperty(window, "location", {
      value: { host: "withjosephine.maxgertzen.workers.dev" },
      configurable: true,
    });
    vi.stubEnv("NEXT_PUBLIC_TRACK_NON_PROD", "1");
    await initAnalytics();
    expect(mixpanel.register).toHaveBeenCalledWith(
      expect.objectContaining({ environment: "workers-dev" }),
    );
  });

  it("tags localhost as environment=local (when opted in)", async () => {
    Object.defineProperty(window, "location", {
      value: { host: "localhost:3000" },
      configurable: true,
    });
    vi.stubEnv("NEXT_PUBLIC_TRACK_NON_PROD", "1");
    await initAnalytics();
    expect(mixpanel.register).toHaveBeenCalledWith(
      expect.objectContaining({ environment: "local" }),
    );
  });

  it("registers $ignore=true when user agent matches the headless pattern", async () => {
    Object.defineProperty(window.navigator, "userAgent", {
      value: "Mozilla/5.0 (HeadlessChrome) Chrome/120.0",
      configurable: true,
    });
    await initAnalytics();
    expect(mixpanel.register).toHaveBeenCalledWith({ $ignore: true });
  });

  it.each(["Lighthouse", "PhantomJS", "Puppeteer", "Playwright"])(
    "registers $ignore=true for %s user agent",
    async (uaSubstring) => {
      Object.defineProperty(window.navigator, "userAgent", {
        value: `Mozilla/5.0 ${uaSubstring}/1.0`,
        configurable: true,
      });
      await initAnalytics();
      const ignoreCall = vi
        .mocked(mixpanel.register)
        .mock.calls.find(([arg]) => (arg as Record<string, unknown>).$ignore === true);
      expect(ignoreCall, `expected $ignore call for UA matching ${uaSubstring}`).toBeDefined();
    },
  );

  it("does NOT register $ignore for normal browser UAs", async () => {
    await initAnalytics();
    const ignoreCall = vi
      .mocked(mixpanel.register)
      .mock.calls.find(([arg]) => (arg as Record<string, unknown>).$ignore === true);
    expect(ignoreCall).toBeUndefined();
  });

  it("is idempotent — second call no-ops", async () => {
    await initAnalytics();
    await initAnalytics();
    expect(mixpanel.init).toHaveBeenCalledTimes(1);
  });

  it("no-ops when NEXT_PUBLIC_MIXPANEL_TOKEN is unset (still marks initialized so queue drains)", async () => {
    vi.stubEnv("NEXT_PUBLIC_MIXPANEL_TOKEN", "");
    await initAnalytics();
    expect(mixpanel.init).not.toHaveBeenCalled();
    expect(isAnalyticsInitialized()).toBe(true);
  });
});

describe("non-production opt-in gate", () => {
  it.each([
    ["preview.withjosephine.com", "preview"],
    ["withjosephine.maxgertzen.workers.dev", "workers-dev"],
    ["localhost:3000", "local"],
  ])("skips init by default on %s (env=%s)", async (host) => {
    Object.defineProperty(window, "location", {
      value: { host },
      configurable: true,
    });
    await initAnalytics();
    expect(mixpanel.init).not.toHaveBeenCalled();
    expect(isAnalyticsInitialized()).toBe(true);
  });

  it("inits on non-prod when NEXT_PUBLIC_TRACK_NON_PROD=1 is set", async () => {
    Object.defineProperty(window, "location", {
      value: { host: "preview.withjosephine.com" },
      configurable: true,
    });
    vi.stubEnv("NEXT_PUBLIC_TRACK_NON_PROD", "1");
    await initAnalytics();
    expect(mixpanel.init).toHaveBeenCalledOnce();
  });

  it("ignores any value other than '1' for the opt-in flag", async () => {
    Object.defineProperty(window, "location", {
      value: { host: "preview.withjosephine.com" },
      configurable: true,
    });
    vi.stubEnv("NEXT_PUBLIC_TRACK_NON_PROD", "true");
    await initAnalytics();
    expect(mixpanel.init).not.toHaveBeenCalled();
  });

  it.each(["withjosephine.com", "www.withjosephine.com"])(
    "always inits on production host %s regardless of opt-in flag",
    async (host) => {
      Object.defineProperty(window, "location", {
        value: { host },
        configurable: true,
      });
      vi.stubEnv("NEXT_PUBLIC_TRACK_NON_PROD", ""); // explicitly unset
      await initAnalytics();
      expect(mixpanel.init).toHaveBeenCalledOnce();
    },
  );

  it("buffer is drained (not held forever) when init is skipped on non-prod", async () => {
    Object.defineProperty(window, "location", {
      value: { host: "localhost:3000" },
      configurable: true,
    });
    track("entry_page_view", {
      reading_id: "soul-blueprint",
      referrer: "",
      viewport_width: 1024,
    });
    await initAnalytics();
    // After skipped init, isInitialized = true, queue cleared.
    // Subsequent track() calls should not accumulate either:
    track("intake_page_view", {
      reading_id: "soul-blueprint",
      page_number: 1,
      total_pages: 6,
    });
    expect(mixpanel.track).not.toHaveBeenCalled();
  });
});

describe("track buffer", () => {
  it("queues events fired before init and flushes them on init", async () => {
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

    await initAnalytics();

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

  it("after init, track() forwards directly to mixpanel.track", async () => {
    await initAnalytics();
    track("intake_save_click", { reading_id: "akashic-record", page_number: 2 });
    expect(mixpanel.track).toHaveBeenCalledWith("intake_save_click", {
      reading_id: "akashic-record",
      page_number: 2,
    });
  });

  it("drops the buffer (no-ops on flush) when token is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_MIXPANEL_TOKEN", "");
    track("entry_page_view", {
      reading_id: "soul-blueprint",
      referrer: "",
      viewport_width: 1024,
    });
    await initAnalytics();
    expect(mixpanel.track).not.toHaveBeenCalled();
  });
});

describe("trackThrottled", () => {
  it("fires the first call and drops subsequent calls within the interval", async () => {
    await initAnalytics();
    trackThrottled(
      "intake_save_auto",
      { reading_id: "soul-blueprint", page_number: 1 },
      30_000,
    );
    trackThrottled(
      "intake_save_auto",
      { reading_id: "soul-blueprint", page_number: 1 },
      30_000,
    );
    expect(mixpanel.track).toHaveBeenCalledOnce();
  });

  it("fires again once the interval elapses", async () => {
    await initAnalytics();
    const realDateNow = Date.now;
    let now = 1_000_000;
    Date.now = () => now;
    try {
      trackThrottled(
        "intake_save_auto",
        { reading_id: "soul-blueprint", page_number: 1 },
        30_000,
      );
      now += 29_999;
      trackThrottled(
        "intake_save_auto",
        { reading_id: "soul-blueprint", page_number: 1 },
        30_000,
      );
      expect(mixpanel.track).toHaveBeenCalledOnce();
      now += 1;
      trackThrottled(
        "intake_save_auto",
        { reading_id: "soul-blueprint", page_number: 1 },
        30_000,
      );
      expect(mixpanel.track).toHaveBeenCalledTimes(2);
    } finally {
      Date.now = realDateNow;
    }
  });

  it("throttles per event name independently", async () => {
    await initAnalytics();
    trackThrottled(
      "intake_save_auto",
      { reading_id: "soul-blueprint", page_number: 1 },
      30_000,
    );
    trackThrottled(
      "intake_save_click",
      { reading_id: "soul-blueprint", page_number: 1 },
      30_000,
    );
    expect(mixpanel.track).toHaveBeenCalledTimes(2);
  });
});

describe("trackUntyped", () => {
  it("forwards arbitrary event names to mixpanel.track post-init", async () => {
    await initAnalytics();
    trackUntyped("button_click", { button_name: "hero_cta" });
    expect(mixpanel.track).toHaveBeenCalledWith("button_click", {
      button_name: "hero_cta",
    });
  });

  it("queues calls before init and flushes them on init", async () => {
    trackUntyped("link_click", { link_id: "footer_about" });
    expect(mixpanel.track).not.toHaveBeenCalled();
    await initAnalytics();
    expect(mixpanel.track).toHaveBeenCalledWith("link_click", {
      link_id: "footer_about",
    });
  });

  it("drops events when bootstrapped without a token (no-op silently)", async () => {
    vi.stubEnv("NEXT_PUBLIC_MIXPANEL_TOKEN", "");
    await initAnalytics();
    trackUntyped("button_click", { button_name: "x" });
    expect(mixpanel.track).not.toHaveBeenCalled();
  });
});

describe("identifySubmission", () => {
  it("calls mixpanel.identify with the submission UUID once initialized", async () => {
    await initAnalytics();
    identifySubmission("sub_test_abc123");
    expect(mixpanel.identify).toHaveBeenCalledWith("sub_test_abc123");
  });

  it("no-ops before init (we never call it before submit_success in practice)", async () => {
    identifySubmission("sub_test_abc123");
    expect(mixpanel.identify).not.toHaveBeenCalled();
  });
});
