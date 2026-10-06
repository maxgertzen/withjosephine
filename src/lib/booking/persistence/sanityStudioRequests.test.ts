import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();
vi.mock("@/lib/sanity/client", () => ({
  getSanityWriteClient: async () => ({ fetch: fetchMock }),
}));

import { fetchStudioRequests } from "./sanityStudioRequests";

const OLD = "2026-10-05T10:00:00.000Z";
const NEW = "2026-10-05T10:05:00.000Z";
const CUTOFF = "2026-10-05T10:03:00.000Z";

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue([
    { _id: "old", _rev: "r1", deliveryRequestedAt: OLD },
    { _id: "new", _rev: "r2", deliveryRequestedAt: NEW },
    {
      _id: "resend-new",
      _rev: "r3",
      emailResendRequest: { emailType: "order_confirmation", requestedAt: NEW },
    },
  ]);
});

describe("fetchStudioRequests", () => {
  it("leaves requests newer than the cutoff to the wake", async () => {
    const requests = await fetchStudioRequests({ requestedBefore: CUTOFF });

    expect(requests.deliveryIds).toEqual(["old"]);
    expect(requests.resendRequests).toEqual([]);
    expect(fetchMock.mock.calls[0]?.[1]).toEqual({ submissionId: null });
  });

  it("asks Sanity for the one clicked submission and takes its request at any age", async () => {
    fetchMock.mockResolvedValue([{ _id: "new", _rev: "r2", deliveryRequestedAt: NEW }]);

    const requests = await fetchStudioRequests({ submissionId: "new" });

    expect(fetchMock.mock.calls[0]?.[1]).toEqual({ submissionId: "new" });
    expect(requests.deliveryIds).toEqual(["new"]);
  });
});

describe("fetchStudioRequests for gift emails", () => {
  it("reads a gift resend request and drops any address typed into it", async () => {
    fetchMock.mockResolvedValue([
      {
        _id: "gift-1",
        _rev: "r4",
        emailResendRequest: {
          emailType: "gift_send",
          correctedEmail: "someone@example.com",
          requestedAt: NEW,
        },
      },
    ]);

    const { resendRequests } = await fetchStudioRequests({ submissionId: "gift-1" });

    expect(resendRequests).toEqual([
      {
        kind: "gift",
        submissionId: "gift-1",
        revision: "r4",
        emailType: "gift_send",
        requestedAt: NEW,
      },
    ]);
  });
});
