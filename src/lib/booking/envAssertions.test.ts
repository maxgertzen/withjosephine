import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { assertEnvironmentBindings } from "./envAssertions";

describe("assertEnvironmentBindings", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is a no-op when ENVIRONMENT is undefined (local next dev)", () => {
    vi.stubEnv("ENVIRONMENT", "");
    vi.stubEnv("R2_BUCKET_NAME", "withjosephine-booking-photos");
    expect(() => assertEnvironmentBindings()).not.toThrow();
  });

  it("is a no-op when R2_BUCKET_NAME is undefined", () => {
    vi.stubEnv("ENVIRONMENT", "production");
    vi.stubEnv("R2_BUCKET_NAME", "");
    expect(() => assertEnvironmentBindings()).not.toThrow();
  });

  it("passes when staging bucket pairs with staging environment", () => {
    vi.stubEnv("ENVIRONMENT", "staging");
    vi.stubEnv("R2_BUCKET_NAME", "withjosephine-booking-photos-staging");
    expect(() => assertEnvironmentBindings()).not.toThrow();
  });

  it("passes when production bucket pairs with production environment", () => {
    vi.stubEnv("ENVIRONMENT", "production");
    vi.stubEnv("R2_BUCKET_NAME", "withjosephine-booking-photos");
    expect(() => assertEnvironmentBindings()).not.toThrow();
  });

  it("throws when ENVIRONMENT=staging but bucket does not end with -staging", () => {
    vi.stubEnv("ENVIRONMENT", "staging");
    vi.stubEnv("R2_BUCKET_NAME", "withjosephine-booking-photos");
    expect(() => assertEnvironmentBindings()).toThrow(
      /ENVIRONMENT=staging.*does not end with -staging/,
    );
  });

  it("throws when ENVIRONMENT=production but bucket ends with -staging", () => {
    vi.stubEnv("ENVIRONMENT", "production");
    vi.stubEnv("R2_BUCKET_NAME", "withjosephine-booking-photos-staging");
    expect(() => assertEnvironmentBindings()).toThrow(
      /ENVIRONMENT=production.*ends with -staging/,
    );
  });
});
