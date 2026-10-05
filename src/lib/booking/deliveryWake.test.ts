import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/cloudflare", () => ({ captureMessage: vi.fn() }));

import { PRODUCTION_DELIVER_REQUESTED_URL, wakeProductionDelivery } from "./deliveryWake";

beforeEach(() => {
  vi.stubEnv("ENVIRONMENT", "staging");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("wakeProductionDelivery", () => {
  it("posts to production deliver-requested with the wake secret", async () => {
    vi.stubEnv("DELIVERY_WAKE_SECRET", "wake");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}"));

    await wakeProductionDelivery();

    expect(fetchSpy).toHaveBeenCalledWith(
      PRODUCTION_DELIVER_REQUESTED_URL,
      expect.objectContaining({ method: "POST", headers: { authorization: "Bearer wake" } }),
    );
    expect(PRODUCTION_DELIVER_REQUESTED_URL).toBe(
      "https://withjosephine.com/api/cron/deliver-requested",
    );
  });

  it("does nothing without the wake secret", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await wakeProductionDelivery();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("never wakes from the production worker", async () => {
    vi.stubEnv("DELIVERY_WAKE_SECRET", "wake");
    vi.stubEnv("ENVIRONMENT", "production");
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await wakeProductionDelivery();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("never throws when production is unreachable", async () => {
    vi.stubEnv("DELIVERY_WAKE_SECRET", "wake");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    await expect(wakeProductionDelivery()).resolves.toBeUndefined();
  });
});
