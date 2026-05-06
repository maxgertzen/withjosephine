import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/browser", () => ({
  init: vi.fn(),
  captureException: vi.fn(),
}));

import * as Sentry from "@sentry/browser";

import {
  _resetForTests,
  captureException,
  initSentryClient,
  isSentryInitialized,
} from "./sentry-client";

const DSN = "https://abc@o123.ingest.de.sentry.io/456";

beforeEach(() => {
  _resetForTests();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", DSN);
  Object.defineProperty(window, "location", {
    value: { host: "withjosephine.com" },
    configurable: true,
  });
});

afterEach(() => {
  _resetForTests();
});

describe("initSentryClient", () => {
  it("calls Sentry.init with the DSN and a derived environment", () => {
    initSentryClient();
    expect(Sentry.init).toHaveBeenCalledTimes(1);
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: DSN,
        environment: "production",
        tracesSampleRate: 0,
        sendDefaultPii: false,
      }),
    );
  });

  it("no-ops when NEXT_PUBLIC_SENTRY_DSN is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    initSentryClient();
    expect(Sentry.init).not.toHaveBeenCalled();
    expect(isSentryInitialized()).toBe(true);
  });

  it("is idempotent — second call does not re-init", () => {
    initSentryClient();
    initSentryClient();
    expect(Sentry.init).toHaveBeenCalledTimes(1);
  });

  it("derives 'preview' for preview.* hosts", () => {
    Object.defineProperty(window, "location", {
      value: { host: "preview.withjosephine.com" },
      configurable: true,
    });
    initSentryClient();
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ environment: "preview" }),
    );
  });

  it("derives 'workers-dev' for *.workers.dev hosts", () => {
    Object.defineProperty(window, "location", {
      value: { host: "withjosephine.maxgertzen.workers.dev" },
      configurable: true,
    });
    initSentryClient();
    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({ environment: "workers-dev" }),
    );
  });

  it("survives an init throw without breaking captureException callers", () => {
    vi.mocked(Sentry.init).mockImplementationOnce(() => {
      throw new Error("init exploded");
    });
    expect(() => initSentryClient()).not.toThrow();
    expect(() => captureException(new Error("boom"))).not.toThrow();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});

describe("captureException", () => {
  it("forwards to Sentry.captureException after init", () => {
    initSentryClient();
    const err = new Error("boom");
    captureException(err);
    expect(Sentry.captureException).toHaveBeenCalledWith(err);
  });

  it("no-ops when init has not run", () => {
    captureException(new Error("boom"));
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});

describe("scrubSensitiveData (via beforeSend)", () => {
  function getBeforeSend(): (event: unknown) => unknown {
    initSentryClient();
    const initArg = vi.mocked(Sentry.init).mock.calls[0]?.[0];
    if (!initArg?.beforeSend) {
      throw new Error("Sentry.init was not called with beforeSend");
    }
    return initArg.beforeSend as (event: unknown) => unknown;
  }

  it("strips cookie / authorization headers from request", () => {
    const beforeSend = getBeforeSend();
    const event = {
      request: {
        headers: {
          cookie: "session=abc",
          authorization: "Bearer xyz",
          "user-agent": "Mozilla/5.0",
        },
      },
    };
    const out = beforeSend(event) as { request: { headers: Record<string, string> } };
    expect(out.request.headers).toEqual({ "user-agent": "Mozilla/5.0" });
  });

  it("redacts the listen token segment of the URL", () => {
    const beforeSend = getBeforeSend();
    const event = {
      request: {
        url: "https://withjosephine.com/listen/eyJhbGciOi.signature?ref=email",
      },
    };
    const out = beforeSend(event) as { request: { url: string } };
    expect(out.request.url).toBe(
      "https://withjosephine.com/listen/[REDACTED]?ref=email",
    );
  });
});
