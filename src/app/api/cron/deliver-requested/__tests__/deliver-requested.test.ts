import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/booking/cron-auth", () => ({
  isCronRequestAuthorized: vi.fn(),
}));

vi.mock("@/lib/booking/readingDelivery", async () => {
  const actual = await vi.importActual<typeof import("@/lib/booking/readingDelivery")>(
    "@/lib/booking/readingDelivery",
  );
  return { ...actual, deliverRequested: vi.fn() };
});

vi.mock("@/lib/booking/persistence/sanityDelivery", () => ({
  clearDeliveryRequest: vi.fn(),
  markDeliveryRequestFailed: vi.fn(),
}));

vi.mock("@/lib/booking/persistence/sanityStudioRequests", () => ({
  fetchStudioRequests: vi.fn(),
  claimResendRequest: vi.fn(),
  restoreResendRequest: vi.fn(),
}));

vi.mock("@/lib/booking/resendCustomerEmail", () => ({
  processResendRequest: vi.fn(),
}));

vi.mock("@/lib/booking/orderConfirmationSweep", () => ({
  flagMissingOrderConfirmations: vi.fn(),
}));

import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import { flagMissingOrderConfirmations } from "@/lib/booking/orderConfirmationSweep";
import {
  clearDeliveryRequest,
  markDeliveryRequestFailed,
} from "@/lib/booking/persistence/sanityDelivery";
import {
  claimResendRequest,
  fetchStudioRequests,
  type PendingResendRequest,
  restoreResendRequest,
} from "@/lib/booking/persistence/sanityStudioRequests";
import { type DeliverOutcome, deliverRequested } from "@/lib/booking/readingDelivery";
import { processResendRequest } from "@/lib/booking/resendCustomerEmail";

const mockAuth = vi.mocked(isCronRequestAuthorized);
const mockDeliverRequested = vi.mocked(deliverRequested);
const mockFetchRequests = vi.mocked(fetchStudioRequests);
const mockClaimResend = vi.mocked(claimResendRequest);
const mockRestoreResend = vi.mocked(restoreResendRequest);
const mockProcessResend = vi.mocked(processResendRequest);
const mockSweep = vi.mocked(flagMissingOrderConfirmations);

const RESEND_REQUEST: PendingResendRequest = {
  kind: "customer",
  submissionId: "sub_9",
  revision: "rev_1",
  emailType: "order_confirmation",
  correctedEmail: "fixed@example.com",
  requestedAt: "2026-10-04T10:00:00.000Z",
};

function requested(deliveryIds: string[], resendRequests: PendingResendRequest[] = []) {
  mockFetchRequests.mockResolvedValueOnce({ deliveryIds, resendRequests });
}

const NO_EXTRAS = { resends: {}, missingOrderConfirmations: 0 };
const mockClear = vi.mocked(clearDeliveryRequest);
const mockMarkFailed = vi.mocked(markDeliveryRequestFailed);

beforeEach(() => {
  vi.stubEnv("AUTH_TOKEN_SECRET", "test-auth-token-secret");
  mockAuth.mockReset().mockReturnValue(true);
  mockDeliverRequested.mockReset().mockResolvedValue("sent");
  mockFetchRequests.mockReset().mockResolvedValue({ deliveryIds: ["sub_1"], resendRequests: [] });
  mockClaimResend.mockReset().mockResolvedValue(undefined);
  mockRestoreResend.mockReset().mockResolvedValue(undefined);
  mockProcessResend.mockReset().mockResolvedValue("sent");
  mockSweep.mockReset().mockResolvedValue(0);
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
    expect(mockFetchRequests).not.toHaveBeenCalled();
  });

  it("returns 500 when AUTH_TOKEN_SECRET is missing", async () => {
    vi.stubEnv("AUTH_TOKEN_SECRET", "");

    const res = await callRoute();

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "AUTH_TOKEN_SECRET missing" });
    expect(mockFetchRequests).not.toHaveBeenCalled();
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
        ...NO_EXTRAS,
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
    requested(["sub_1", "sub_2"]);
    mockClear.mockRejectedValueOnce(new Error("Sanity 404"));

    const res = await callRoute();

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ requested: 2, sent: 2 });
    expect(mockDeliverRequested).toHaveBeenCalledWith("sub_2");
    expect(mockClear).toHaveBeenCalledWith("sub_2");
  });

  it("processes every requested submission", async () => {
    requested(["sub_1", "sub_2"]);
    mockDeliverRequested.mockResolvedValueOnce("sent").mockResolvedValueOnce("awaitingAssets");

    const body = await (await callRoute()).json();

    expect(body).toEqual({
      requested: 2,
      sent: 1,
      alreadySent: 0,
      dryRun: 0,
      retryLater: 0,
      failed: 1,
      ...NO_EXTRAS,
    });
    expect(mockClear).toHaveBeenCalledWith("sub_1");
    expect(mockMarkFailed).toHaveBeenCalledWith("sub_2", expect.any(String));
  });

  it("claims and processes a resend request, and counts it by outcome", async () => {
    requested([], [RESEND_REQUEST]);

    const body = await (await callRoute()).json();

    expect(mockClaimResend).toHaveBeenCalledWith(RESEND_REQUEST);
    expect(mockProcessResend).toHaveBeenCalledWith(RESEND_REQUEST);
    expect(mockRestoreResend).not.toHaveBeenCalled();
    expect(body).toMatchObject({ requested: 0, resends: { sent: 1 } });
  });

  it("does not process a resend request it could not claim", async () => {
    requested([], [RESEND_REQUEST]);
    mockClaimResend.mockRejectedValueOnce(new Error("revision mismatch"));

    const body = await (await callRoute()).json();

    expect(mockProcessResend).not.toHaveBeenCalled();
    expect(body).toMatchObject({ resends: { notClaimed: 1 } });
  });

  it("puts a resend request back and carries on when processing throws", async () => {
    requested(["sub_1"], [RESEND_REQUEST]);
    mockProcessResend.mockRejectedValueOnce(new Error("D1 down"));

    const res = await callRoute();

    expect(res.status).toBe(200);
    expect(mockRestoreResend).toHaveBeenCalledWith(RESEND_REQUEST);
    expect(mockDeliverRequested).toHaveBeenCalledWith("sub_1");
  });

  it("puts a resend request back when the outcome is retryLater", async () => {
    requested([], [RESEND_REQUEST]);
    mockProcessResend.mockResolvedValueOnce("retryLater");

    await callRoute();

    expect(mockRestoreResend).toHaveBeenCalledWith(RESEND_REQUEST);
  });

  it("processes resend requests before delivery requests", async () => {
    requested(["sub_1"], [RESEND_REQUEST]);
    const order: string[] = [];
    mockProcessResend.mockImplementationOnce(async () => {
      order.push("resend");
      return "sent";
    });
    mockDeliverRequested.mockImplementationOnce(async () => {
      order.push("delivery");
      return "sent";
    });

    await callRoute();

    expect(order).toEqual(["resend", "delivery"]);
  });

  it("reports how many paid submissions were flagged for a missing order confirmation", async () => {
    mockSweep.mockResolvedValueOnce(2);

    const body = await (await callRoute()).json();

    expect(body).toMatchObject({ missingOrderConfirmations: 2 });
  });

  it("leaves requests made in the last 2 minutes to the Studio wake", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-05T10:00:00.000Z") });
    mockAuth.mockReturnValue(true);

    await callRoute();

    expect(mockFetchRequests).toHaveBeenCalledWith({ requestedBefore: "2026-10-05T09:58:00.000Z" });
    vi.useRealTimers();
  });
});
