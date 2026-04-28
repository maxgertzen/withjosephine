import { afterEach, describe, expect, it, vi } from "vitest";

import { optionalEnv, requireEnv } from "./env";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("requireEnv", () => {
  it("returns the value when the env var is set", () => {
    vi.stubEnv("EXAMPLE_VAR", "hello");
    expect(requireEnv("EXAMPLE_VAR")).toBe("hello");
  });

  it("throws when the env var is missing", () => {
    vi.stubEnv("EXAMPLE_VAR", "");
    expect(() => requireEnv("EXAMPLE_VAR")).toThrow("Missing required env var: EXAMPLE_VAR");
  });
});

describe("optionalEnv", () => {
  it("returns the value when the env var is set", () => {
    vi.stubEnv("EXAMPLE_VAR", "hello");
    expect(optionalEnv("EXAMPLE_VAR")).toBe("hello");
  });

  it("returns null when the env var is missing", () => {
    vi.stubEnv("EXAMPLE_VAR", "");
    expect(optionalEnv("EXAMPLE_VAR")).toBeNull();
  });

  it("logs a warning when missingWarning is provided and the var is missing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("EXAMPLE_VAR", "");

    optionalEnv("EXAMPLE_VAR", "feature disabled");

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("EXAMPLE_VAR"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("feature disabled"));
  });

  it("does not log when the var is set even with missingWarning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("EXAMPLE_VAR", "value");

    optionalEnv("EXAMPLE_VAR", "feature disabled");

    expect(warn).not.toHaveBeenCalled();
  });
});
