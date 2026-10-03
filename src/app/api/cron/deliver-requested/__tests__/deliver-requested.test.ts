import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/booking/cron-auth", () => ({
  isCronRequestAuthorized: vi.fn(),
}));

vi.mock("@/lib/booking/deliverDay7", () => ({
  deliverById: vi.fn(),
}));

vi.mock("@/lib/booking/persistence/sanityDelivery", () => ({
  clearDeliveryRequest: vi.fn(),
  fetchDeliveryRequestedIds: vi.fn(),
  markDeliveryRequestFailed: vi.fn(),
  setDeliveredAtIfMissing: vi.fn(),
}));

import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import { deliverById, type DeliverOutcome } from "@/lib/booking/deliverDay7";
import {
  clearDeliveryRequest,
  fetchDeliveryRequestedIds,
  markDeliveryRequestFailed,
  setDeliveredAtIfMissing,
} from "@/lib/booking/persistence/sanityDelivery";

const mockAuth = vi.mocked(isCronRequestAuthorized);
const mockDeliverById = vi.mocked(deliverById);
const mockFetchRequested = vi.mocked(fetchDeliveryRequestedIds);
const mockClear = vi.mocked(clearDeliveryRequest);
const mockMarkFailed = vi.mocked(markDeliveryRequestFailed);
const mockSetDeliveredAt = vi.mocked(setDeliveredAtIfMissing);

beforeEach(() => {
  vi.stubEnv("AUTH_TOKEN_SECRET", "test-auth-token-secret");
  mockAuth.mockReset().mockReturnValue(true);
  mockDeliverById.mockReset().mockResolvedValue("sent");
  mockFetchRequested.mockReset().mockResolvedValue(["sub_1"]);
  mockClear.mockReset().mockResolvedValue(undefined);
  mockMarkFailed.mockReset().mockResolvedValue(undefined);
  mockSetDeliveredAt.mockReset().mockResolvedValue(undefined);
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
      mockDeliverById.mockResolvedValueOnce(outcome);

      const body = await (await callRoute()).json();

      expect(body).toEqual({
        requested: 1,
        sent: 0,
        alreadySent: 0,
        dryRun: 0,
        failed: 0,
        [outcome]: 1,
      });
      expect(mockClear).toHaveBeenCalledWith("sub_1");
      expect(mockMarkFailed).not.toHaveBeenCalled();
    },
  );

  it.each<DeliverOutcome>(["skipped", "awaitingAssets", "notFound"])(
    "records a failure and clears the request when the outcome is %s",
    async (outcome) => {
      mockDeliverById.mockResolvedValueOnce(outcome);

      const body = await (await callRoute()).json();

      expect(body).toMatchObject({ sent: 0, failed: 1 });
      expect(mockMarkFailed).toHaveBeenCalledWith("sub_1", expect.any(String));
      expect(mockClear).not.toHaveBeenCalled();
    },
  );

  it("records a failure when delivery throws", async () => {
    mockDeliverById.mockRejectedValueOnce(new Error("D1 down"));

    const body = await (await callRoute()).json();

    expect(body).toMatchObject({ failed: 1 });
    expect(mockMarkFailed).toHaveBeenCalledWith("sub_1", expect.any(String));
  });

  it("records a failure when setting deliveredAt throws, without delivering", async () => {
    mockSetDeliveredAt.mockRejectedValueOnce(new Error("Sanity down"));

    const body = await (await callRoute()).json();

    expect(body).toMatchObject({ failed: 1 });
    expect(mockDeliverById).not.toHaveBeenCalled();
  });

  it("sets deliveredAt before delivering", async () => {
    await callRoute();

    expect(mockSetDeliveredAt).toHaveBeenCalledWith("sub_1", expect.any(String));
    expect(mockSetDeliveredAt.mock.invocationCallOrder[0]).toBeLessThan(
      mockDeliverById.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("keeps processing the next submission when a request update fails", async () => {
    mockFetchRequested.mockResolvedValueOnce(["sub_1", "sub_2"]);
    mockClear.mockRejectedValueOnce(new Error("Sanity 404"));

    const res = await callRoute();

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ requested: 2, sent: 2 });
    expect(mockDeliverById).toHaveBeenCalledWith("sub_2");
    expect(mockClear).toHaveBeenCalledWith("sub_2");
  });

  it("processes every requested submission", async () => {
    mockFetchRequested.mockResolvedValueOnce(["sub_1", "sub_2"]);
    mockDeliverById.mockResolvedValueOnce("sent").mockResolvedValueOnce("awaitingAssets");

    const body = await (await callRoute()).json();

    expect(body).toEqual({ requested: 2, sent: 1, alreadySent: 0, dryRun: 0, failed: 1 });
    expect(mockClear).toHaveBeenCalledWith("sub_1");
    expect(mockMarkFailed).toHaveBeenCalledWith("sub_2", expect.any(String));
  });
});
