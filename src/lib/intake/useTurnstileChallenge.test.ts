import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useTurnstileChallenge } from "./useTurnstileChallenge";

beforeEach(() => {
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("useTurnstileChallenge — env derivation", () => {
  it("turnstileRequired is true when a site key is configured and bypass is off", () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key-prod");
    vi.stubEnv("NEXT_PUBLIC_BOOKING_TURNSTILE_BYPASS", "");
    const { result } = renderHook(() => useTurnstileChallenge());
    expect(result.current.turnstileRequired).toBe(true);
    expect(result.current.turnstileSiteKey).toBe("site-key-prod");
  });

  it("turnstileRequired is false when no site key is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    const { result } = renderHook(() => useTurnstileChallenge());
    expect(result.current.turnstileRequired).toBe(false);
  });

  it("turnstileRequired is false when bypass=1 in non-production", () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key-dev");
    vi.stubEnv("NEXT_PUBLIC_BOOKING_TURNSTILE_BYPASS", "1");
    const { result } = renderHook(() => useTurnstileChallenge());
    expect(result.current.turnstileRequired).toBe(false);
  });
});

describe("useTurnstileChallenge — requestFreshToken", () => {
  it("returns 'bypass' when bypass=1 in non-production", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key");
    vi.stubEnv("NEXT_PUBLIC_BOOKING_TURNSTILE_BYPASS", "1");
    const { result } = renderHook(() => useTurnstileChallenge());
    const token = await result.current.requestFreshToken();
    expect(token).toBe("bypass");
  });

  it("returns null when no site key is configured (never falls through to bypass)", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_BOOKING_TURNSTILE_BYPASS", "");
    const { result } = renderHook(() => useTurnstileChallenge());
    const token = await result.current.requestFreshToken();
    expect(token).toBeNull();
  });

  it("returns null when a site key is configured but the widget ref hasn't attached yet", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key");
    vi.stubEnv("NEXT_PUBLIC_BOOKING_TURNSTILE_BYPASS", "");
    const { result } = renderHook(() => useTurnstileChallenge());
    const token = await result.current.requestFreshToken();
    expect(token).toBeNull();
  });
});

describe("useTurnstileChallenge — handleSuccess / handleFailure", () => {
  it("handleSuccess sets turnstileToken to the supplied token", () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key");
    const { result } = renderHook(() => useTurnstileChallenge());
    act(() => {
      result.current.handleSuccess("fresh-token");
    });
    expect(result.current.turnstileToken).toBe("fresh-token");
  });

  it("handleFailure clears turnstileToken back to null", () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key");
    const { result } = renderHook(() => useTurnstileChallenge());
    act(() => {
      result.current.handleSuccess("fresh-token");
    });
    expect(result.current.turnstileToken).toBe("fresh-token");
    act(() => {
      result.current.handleFailure();
    });
    expect(result.current.turnstileToken).toBeNull();
  });
});
