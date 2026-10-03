import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isCronRequestAuthorized, scheduledCronRequest, withoutCronHeader } from "./cron-auth";

const URL = "http://localhost/api/cron/test";

beforeEach(() => {
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isCronRequestAuthorized", () => {
  it("accepts requests with cf-cron header", () => {
    const request = new Request(URL, { headers: { "cf-cron": "0 */6 * * *" } });
    expect(isCronRequestAuthorized(request)).toBe(true);
  });

  it("accepts Bearer token when CRON_SECRET matches", () => {
    vi.stubEnv("CRON_SECRET", "shhh");
    const request = new Request(URL, { headers: { authorization: "Bearer shhh" } });
    expect(isCronRequestAuthorized(request)).toBe(true);
  });

  it("rejects Bearer token when CRON_SECRET does not match", () => {
    vi.stubEnv("CRON_SECRET", "shhh");
    const request = new Request(URL, { headers: { authorization: "Bearer wrong" } });
    expect(isCronRequestAuthorized(request)).toBe(false);
  });

  it("rejects when CRON_SECRET is not set and no cf-cron header", () => {
    vi.stubEnv("CRON_SECRET", "");
    const request = new Request(URL, { headers: { authorization: "Bearer anything" } });
    expect(isCronRequestAuthorized(request)).toBe(false);
  });

  it("rejects when no auth header and no cf-cron header", () => {
    vi.stubEnv("CRON_SECRET", "shhh");
    const request = new Request(URL);
    expect(isCronRequestAuthorized(request)).toBe(false);
  });

  it("rejects malformed Authorization header", () => {
    vi.stubEnv("CRON_SECRET", "shhh");
    const request = new Request(URL, { headers: { authorization: "Basic shhh" } });
    expect(isCronRequestAuthorized(request)).toBe(false);
  });
});

describe("scheduledCronRequest", () => {
  it("builds a POST that cron auth accepts without CRON_SECRET", () => {
    vi.stubEnv("CRON_SECRET", "");
    const request = scheduledCronRequest(URL);
    expect(request.method).toBe("POST");
    expect(request.url).toBe(URL);
    expect(isCronRequestAuthorized(request)).toBe(true);
  });
});

describe("withoutCronHeader", () => {
  it("strips cf-cron from a public request so cron auth rejects it", async () => {
    vi.stubEnv("CRON_SECRET", "shhh");
    const publicRequest = new Request(`${URL}?force=abc`, {
      method: "POST",
      headers: { "cf-cron": "1", "content-type": "application/json" },
      body: '{"a":1}',
    });

    const forwarded = withoutCronHeader(publicRequest);

    expect(forwarded.headers.has("cf-cron")).toBe(false);
    expect(isCronRequestAuthorized(forwarded)).toBe(false);
    expect(forwarded.method).toBe("POST");
    expect(forwarded.url).toBe(`${URL}?force=abc`);
    expect(forwarded.headers.get("content-type")).toBe("application/json");
    expect(await forwarded.text()).toBe('{"a":1}');
  });

  it("keeps Bearer CRON_SECRET working on a request that also sent cf-cron", () => {
    vi.stubEnv("CRON_SECRET", "shhh");
    const publicRequest = new Request(URL, {
      headers: { "cf-cron": "1", authorization: "Bearer shhh" },
    });
    expect(isCronRequestAuthorized(withoutCronHeader(publicRequest))).toBe(true);
  });

  it("returns the same request when cf-cron is absent", () => {
    const publicRequest = new Request(URL);
    expect(withoutCronHeader(publicRequest)).toBe(publicRequest);
  });
});
