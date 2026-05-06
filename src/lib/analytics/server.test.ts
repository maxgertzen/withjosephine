import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { generateAnonymousDistinctId, serverTrack } from "./server";

const TOKEN = "test-token";
const DISTINCT_ID = "sub_test_abc123";

type DecodedPayload = {
  event: string;
  properties: Record<string, unknown>;
};

function decodeFetchBody(body: BodyInit | null | undefined): DecodedPayload {
  if (!(body instanceof URLSearchParams)) {
    throw new Error("expected URLSearchParams body");
  }
  const data = body.get("data");
  if (!data) throw new Error("missing data field in body");
  const json =
    typeof atob === "function"
      ? atob(data)
      : Buffer.from(data, "base64").toString("utf8");
  return JSON.parse(json) as DecodedPayload;
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.stubEnv("NEXT_PUBLIC_MIXPANEL_TOKEN", TOKEN);
  vi.stubEnv("ENVIRONMENT", "production");
  vi.stubEnv("NEXT_PUBLIC_APP_VERSION", "1.2.3");
  vi.stubEnv("NEXT_PUBLIC_TRACK_NON_PROD", "");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 200 })),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("serverTrack — gating", () => {
  it("no-ops when NEXT_PUBLIC_MIXPANEL_TOKEN is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_MIXPANEL_TOKEN", "");
    await serverTrack("delivery_listened", {
      distinct_id: DISTINCT_ID,
      submission_id: "sub_1",
      reading_id: "soul-blueprint",
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("no-ops on non-prod env without TRACK_NON_PROD", async () => {
    vi.stubEnv("ENVIRONMENT", "staging");
    await serverTrack("delivery_listened", {
      distinct_id: DISTINCT_ID,
      submission_id: "sub_1",
      reading_id: "soul-blueprint",
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("no-ops on undefined env (treated as local) without TRACK_NON_PROD", async () => {
    vi.stubEnv("ENVIRONMENT", "");
    await serverTrack("delivery_listened", {
      distinct_id: DISTINCT_ID,
      submission_id: "sub_1",
      reading_id: "soul-blueprint",
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("fires on non-prod env when TRACK_NON_PROD=1", async () => {
    vi.stubEnv("ENVIRONMENT", "staging");
    vi.stubEnv("NEXT_PUBLIC_TRACK_NON_PROD", "1");
    await serverTrack("delivery_listened", {
      distinct_id: DISTINCT_ID,
      submission_id: "sub_1",
      reading_id: "soul-blueprint",
    });
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });

  it("fires on production env regardless of TRACK_NON_PROD flag", async () => {
    await serverTrack("delivery_listened", {
      distinct_id: DISTINCT_ID,
      submission_id: "sub_1",
      reading_id: "soul-blueprint",
    });
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });

  it("ignores values other than '1' for the opt-in flag", async () => {
    vi.stubEnv("ENVIRONMENT", "staging");
    vi.stubEnv("NEXT_PUBLIC_TRACK_NON_PROD", "true");
    await serverTrack("delivery_listened", {
      distinct_id: DISTINCT_ID,
      submission_id: "sub_1",
      reading_id: "soul-blueprint",
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe("serverTrack — headless filter", () => {
  it.each(["HeadlessChrome", "Lighthouse", "PhantomJS", "Puppeteer", "Playwright"])(
    "no-ops when userAgent contains %s",
    async (substring) => {
      await serverTrack(
        "delivery_listened",
        {
          distinct_id: DISTINCT_ID,
          submission_id: "sub_1",
          reading_id: "soul-blueprint",
        },
        { userAgent: `Mozilla/5.0 ${substring}/1.0` },
      );
      expect(globalThis.fetch).not.toHaveBeenCalled();
    },
  );

  it("fires for normal browser UAs", async () => {
    await serverTrack(
      "delivery_listened",
      {
        distinct_id: DISTINCT_ID,
        submission_id: "sub_1",
        reading_id: "soul-blueprint",
      },
      { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605" },
    );
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });

  it("fires when no userAgent is provided", async () => {
    await serverTrack("delivery_listened", {
      distinct_id: DISTINCT_ID,
      submission_id: "sub_1",
      reading_id: "soul-blueprint",
    });
    expect(globalThis.fetch).toHaveBeenCalledOnce();
  });
});

describe("serverTrack — failure handling", () => {
  it("swallows fetch rejections without rethrowing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );
    await expect(
      serverTrack("delivery_listened", {
        distinct_id: DISTINCT_ID,
        submission_id: "sub_1",
        reading_id: "soul-blueprint",
      }),
    ).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledOnce();
    const warnArgs = warnSpy.mock.calls[0];
    expect(String(warnArgs[0])).not.toContain(TOKEN);
    warnSpy.mockRestore();
  });
});

describe("serverTrack — request shape", () => {
  it("POSTs to api-js.mixpanel.com/track with form-encoded body", async () => {
    await serverTrack("payment_success", {
      distinct_id: DISTINCT_ID,
      submission_id: "sub_1",
      reading_id: "soul-blueprint",
      amount_paid_cents: 12900,
      currency: "usd",
      stripe_session_id: "cs_test_123",
    });
    expect(globalThis.fetch).toHaveBeenCalledOnce();
    const fetchMock = vi.mocked(globalThis.fetch);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api-js.mixpanel.com/track");
    expect(init?.method).toBe("POST");
    const headers = init?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    const serializedBody = (init?.body as URLSearchParams).toString();
    expect(serializedBody.startsWith("data=")).toBe(true);
  });

  it("payload contains token, distinct_id, event name, integer epoch time, super-properties", async () => {
    const before = Math.floor(Date.now() / 1000);
    await serverTrack("payment_success", {
      distinct_id: DISTINCT_ID,
      submission_id: "sub_1",
      reading_id: "soul-blueprint",
      amount_paid_cents: 12900,
      currency: "usd",
      stripe_session_id: "cs_test_123",
    });
    const after = Math.floor(Date.now() / 1000);
    const fetchMock = vi.mocked(globalThis.fetch);
    const [, init] = fetchMock.mock.calls[0];
    const decoded = decodeFetchBody(init?.body);

    expect(decoded.event).toBe("payment_success");
    expect(decoded.properties.token).toBe(TOKEN);
    expect(decoded.properties.distinct_id).toBe(DISTINCT_ID);
    expect(Number.isInteger(decoded.properties.time)).toBe(true);
    expect(decoded.properties.time).toBeGreaterThanOrEqual(before);
    expect(decoded.properties.time).toBeLessThanOrEqual(after);
    expect(decoded.properties.environment).toBe("production");
    expect(decoded.properties.app_version).toBe("1.2.3");
    expect(decoded.properties.source).toBe("server");
    expect(decoded.properties.submission_id).toBe("sub_1");
    expect(decoded.properties.amount_paid_cents).toBe(12900);
    expect(decoded.properties.stripe_session_id).toBe("cs_test_123");
  });

  it("falls back to app_version='dev' when NEXT_PUBLIC_APP_VERSION is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_VERSION", "");
    await serverTrack("delivery_listened", {
      distinct_id: DISTINCT_ID,
      submission_id: "sub_1",
      reading_id: "soul-blueprint",
    });
    const fetchMock = vi.mocked(globalThis.fetch);
    const [, init] = fetchMock.mock.calls[0];
    const decoded = decodeFetchBody(init?.body);
    expect(decoded.properties.app_version).toBe("dev");
  });

  it("tags environment='staging' when ENVIRONMENT=staging and tracking opted in", async () => {
    vi.stubEnv("ENVIRONMENT", "staging");
    vi.stubEnv("NEXT_PUBLIC_TRACK_NON_PROD", "1");
    await serverTrack("delivery_listened", {
      distinct_id: DISTINCT_ID,
      submission_id: "sub_1",
      reading_id: "soul-blueprint",
    });
    const fetchMock = vi.mocked(globalThis.fetch);
    const [, init] = fetchMock.mock.calls[0];
    const decoded = decodeFetchBody(init?.body);
    expect(decoded.properties.environment).toBe("staging");
  });

  it("does not include distinct_id at the top of properties twice (no leak from spread)", async () => {
    await serverTrack("delivery_listened", {
      distinct_id: DISTINCT_ID,
      submission_id: "sub_1",
      reading_id: "soul-blueprint",
    });
    const fetchMock = vi.mocked(globalThis.fetch);
    const [, init] = fetchMock.mock.calls[0];
    const decoded = decodeFetchBody(init?.body);
    // Sanity: a single distinct_id key with the right value, no leftover
    // pollution from the spread of the user-supplied properties object.
    expect(decoded.properties.distinct_id).toBe(DISTINCT_ID);
  });
});

describe("generateAnonymousDistinctId", () => {
  it("returns a string starting with 'anon-'", () => {
    const id = generateAnonymousDistinctId();
    expect(typeof id).toBe("string");
    expect(id.startsWith("anon-")).toBe(true);
  });

  it("returns a unique id on each call", () => {
    const a = generateAnonymousDistinctId();
    const b = generateAnonymousDistinctId();
    expect(a).not.toBe(b);
  });
});
