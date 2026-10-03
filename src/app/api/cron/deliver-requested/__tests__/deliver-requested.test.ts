import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/booking/cron-auth", () => ({
  isCronRequestAuthorized: vi.fn(),
}));

vi.mock("@/lib/booking/deliverDay7", () => ({
  deliverRequested: vi.fn(),
}));

vi.mock("@/lib/booking/persistence/sanityDelivery", () => ({
  clearDeliveryRequest: vi.fn(),
  fetchDeliveryRequestedIds: vi.fn(),
  markDeliveryRequestFailed: vi.fn(),
}));

import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import { type DeliverOutcome, deliverRequested } from "@/lib/booking/deliverDay7";
import {
  clearDeliveryRequest,
  fetchDeliveryRequestedIds,
  markDeliveryRequestFailed,
} from "@/lib/booking/persistence/sanityDelivery";

const mockAuth = vi.mocked(isCronRequestAuthorized);
const mockDeliverRequested = vi.mocked(deliverRequested);
const mockFetchRequested = vi.mocked(fetchDeliveryRequestedIds);
const mockClear = vi.mocked(clearDeliveryRequest);
const mockMarkFailed = vi.mocked(markDeliveryRequestFailed);

beforeEach(() => {
  vi.stubEnv("AUTH_TOKEN_SECRET", "test-auth-token-secret");
  mockAuth.mockReset().mockReturnValue(true);
  mockDeliverRequested.mockReset().mockResolvedValue("sent");
  mockFetchRequested.mockReset().mockResolvedValue(["sub_1"]);
  mockClear.mockReset().mockResolvedValue(undefined);
  mockMarkFailed.mockReset().mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function callRoute(): Promise<Response> {
  const { POST } = await import("../route");
  return POST(
    new Request("http://localhost/api/cron/deliver-requested", { method: "POST" }),
  );
}

describe("/api/cron/deliver-requested", () => {
  it("returns 401 when unauthorized", async () => {
    mockAuth.mockReturnValueOnce(false);

    const res = await callRoute();

    expect(res.status).toBe(401);
    expect(mockFetchRequested).not.toHaveBeenCalled();
  });

  it("returns 500 when AUTH_TOKEN_SECRET is missing", async () => {
    vi.stubEnv("AUTH_TOKEN_SECRET", "");

    const res = await callRoute();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "AUTH_TOKEN_SECRET missing" });
    expect(mockFetchRequested).not.toHaveBeenCalled();
  });

  it.each(["sent", "alreadySent", "dryRun"] as const)(
    "clears the request and records no failure when the outcome is %s",
    async (outcome) => {
      mockDeliverRequested.mockResolvedValueOnce(outcome);

      const body = await (await callRoute()).json();

      expect(body).toEqual({
        requested: 1,
        sent: 0,
        alreadySent: 0,
        dryRun: 0,
        retryLater: 0,
        failed: 0,
        [outcome]: 1,
      });
      expect(mockClear).toHaveBeenCalledWith("sub_1");
      expect(mockMarkFailed).not.toHaveBeenCalled();
    },
  );

  it("keeps the request pending without a failure when the outcome is retryLater", async () => {
    mockDeliverRequested.mockResolvedValueOnce("retryLater");

    const body = await (await callRoute()).json();

    expect(body).toMatchObject({ retryLater: 1, failed: 0 });
    expect(mockClear).not.toHaveBeenCalled();
    expect(mockMarkFailed).not.toHaveBeenCalled();
  });

  it.each<DeliverOutcome>(["skipped", "awaitingAssets", "notFound", "attemptExpired"])(
    "records a failure and clears the request when the outcome is %s",
    async (outcome) => {
      mockDeliverRequested.mockResolvedValueOnce(outcome);

      const body = await (await callRoute()).json();

      expect(body).toMatchObject({ sent: 0, failed: 1 });
      expect(mockMarkFailed).toHaveBeenCalledWith("sub_1", expect.any(String));
      expect(mockClear).not.toHaveBeenCalled();
    },
  );

  it("records a failure when delivery throws", async () => {
    mockDeliverRequested.mockRejectedValueOnce(new Error("D1 down"));

    const body = await (await callRoute()).json();

    expect(body).toMatchObject({ failed: 1 });
    expect(mockMarkFailed).toHaveBeenCalledWith("sub_1", expect.any(String));
  });

  it("keeps processing the next submission when a request update fails", async () => {
    mockFetchRequested.mockResolvedValueOnce(["sub_1", "sub_2"]);
    mockClear.mockRejectedValueOnce(new Error("Sanity 404"));

    const res = await callRoute();

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ requested: 2, sent: 2 });
    expect(mockDeliverRequested).toHaveBeenCalledWith("sub_2");
    expect(mockClear).toHaveBeenCalledWith("sub_2");
  });

  it("processes every requested submission", async () => {
    mockFetchRequested.mockResolvedValueOnce(["sub_1", "sub_2"]);
    mockDeliverRequested.mockResolvedValueOnce("sent").mockResolvedValueOnce("awaitingAssets");

    const body = await (await callRoute()).json();

    expect(body).toEqual({
      requested: 2,
      sent: 1,
      alreadySent: 0,
      dryRun: 0,
      retryLater: 0,
      failed: 1,
    });
    expect(mockClear).toHaveBeenCalledWith("sub_1");
    expect(mockMarkFailed).toHaveBeenCalledWith("sub_2", expect.any(String));
  });
});
