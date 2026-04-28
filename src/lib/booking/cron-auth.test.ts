import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isCronRequestAuthorized } from "./cron-auth";

const URL = "http://localhost/api/cron/test";

describe("isCronRequestAuthorized", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts requests with cf-cron header (Cloudflare-triggered)", () => {
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
