import { afterEach, describe, expect, it, vi } from "vitest";

import { isFlagEnabled, optionalEnv, requireEnv } from "./env";

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
