import { afterEach, describe, expect, it, vi } from "vitest";

import { isFlagEnabled, optionalEnv, requireEnv, siteOrigin, siteOriginFromEnv } from "./env";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("requireEnv", () => {
  it("returns the value when the env var is set", () => {
    vi.stubEnv("ADMIN_API_KEY", "hello");
    expect(requireEnv("ADMIN_API_KEY")).toBe("hello");
  });

  it("throws when the env var is missing", () => {
    vi.stubEnv("ADMIN_API_KEY", "");
    expect(() => requireEnv("ADMIN_API_KEY")).toThrow("Missing required env var: ADMIN_API_KEY");
  });
});

describe("optionalEnv", () => {
  it("returns the value when the env var is set", () => {
    vi.stubEnv("ADMIN_API_KEY", "hello");
    expect(optionalEnv("ADMIN_API_KEY")).toBe("hello");
  });

  it("returns null when the env var is missing", () => {
    vi.stubEnv("ADMIN_API_KEY", "");
    expect(optionalEnv("ADMIN_API_KEY")).toBeNull();
  });

  it("logs a warning when missingWarning is provided and the var is missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("ADMIN_API_KEY", "");

    optionalEnv("ADMIN_API_KEY", "feature disabled");

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("ADMIN_API_KEY"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("feature disabled"));
  });

  it("does not log when the var is set even with missingWarning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("ADMIN_API_KEY", "value");

    optionalEnv("ADMIN_API_KEY", "feature disabled");

    expect(warn).not.toHaveBeenCalled();
  });
});

describe("isFlagEnabled", () => {
  it("returns true for '1'", () => {
    vi.stubEnv("RESEND_DRY_RUN", "1");
    expect(isFlagEnabled("RESEND_DRY_RUN")).toBe(true);
  });

  it("returns true for 'true'", () => {
    vi.stubEnv("RESEND_DRY_RUN", "true");
    expect(isFlagEnabled("RESEND_DRY_RUN")).toBe(true);
  });

  it("returns false for '0'", () => {
    vi.stubEnv("RESEND_DRY_RUN", "0");
    expect(isFlagEnabled("RESEND_DRY_RUN")).toBe(false);
  });

  it("returns false when unset", () => {
    vi.stubEnv("RESEND_DRY_RUN", "");
    expect(isFlagEnabled("RESEND_DRY_RUN")).toBe(false);
  });

  it("returns false for any other truthy-looking string", () => {
    vi.stubEnv("RESEND_DRY_RUN", "yes");
    expect(isFlagEnabled("RESEND_DRY_RUN")).toBe(false);
  });
});

describe("siteOrigin", () => {
  it("returns NEXT_PUBLIC_SITE_ORIGIN when set", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_ORIGIN", "https://example.test");
    vi.stubEnv("ENVIRONMENT", "staging");
    expect(siteOrigin()).toBe("https://example.test");
  });

  it("falls back to the staging origin when ENVIRONMENT=staging and the public var is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_ORIGIN", "");
    vi.stubEnv("ENVIRONMENT", "staging");
    expect(siteOrigin()).toBe("https://staging.withjosephine.com");
  });

  it("falls back to the production origin when neither override is set", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_ORIGIN", "");
    vi.stubEnv("ENVIRONMENT", "");
    expect(siteOrigin()).toBe("https://withjosephine.com");
  });
});

describe("siteOriginFromEnv", () => {
  it("returns NEXT_PUBLIC_SITE_ORIGIN when set on the worker binding", () => {
    expect(
      siteOriginFromEnv({ NEXT_PUBLIC_SITE_ORIGIN: "https://example.test", ENVIRONMENT: "staging" }),
    ).toBe("https://example.test");
  });

  it("falls back to the staging origin when env.ENVIRONMENT=staging", () => {
    expect(siteOriginFromEnv({ ENVIRONMENT: "staging" })).toBe("https://staging.withjosephine.com");
  });

  it("falls back to the production origin when neither binding is set", () => {
    expect(siteOriginFromEnv({})).toBe("https://withjosephine.com");
  });
});
