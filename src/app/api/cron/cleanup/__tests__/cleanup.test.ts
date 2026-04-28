import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/booking/cron-auth", () => ({
  isCronRequestAuthorized: vi.fn(),
}));

vi.mock("@/lib/booking/submissions", () => ({
  listSubmissionsByStatusOlderThan: vi.fn(),
  markSubmissionExpired: vi.fn(),
  deleteSubmissionAndPhoto: vi.fn(),
  scrubSubmissionPhoto: vi.fn(),
}));

import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import {
  deleteSubmissionAndPhoto,
  listSubmissionsByStatusOlderThan,
  markSubmissionExpired,
  scrubSubmissionPhoto,
  type SubmissionRecord,
} from "@/lib/booking/submissions";

const mockAuth = vi.mocked(isCronRequestAuthorized);
const mockList = vi.mocked(listSubmissionsByStatusOlderThan);
const mockMarkExpired = vi.mocked(markSubmissionExpired);
const mockDelete = vi.mocked(deleteSubmissionAndPhoto);
const mockScrub = vi.mocked(scrubSubmissionPhoto);

function makeSubmission(overrides: Partial<SubmissionRecord> = {}): SubmissionRecord {
  return {
    _id: "sub_x",
    status: "pending",
    email: "x@example.com",
    responses: [],
    createdAt: "2026-04-01T00:00:00Z",
    reading: null,
    ...overrides,
  };
}

beforeEach(() => {
  mockAuth.mockReset();
  mockList.mockReset().mockResolvedValue([]);
  mockMarkExpired.mockReset().mockResolvedValue(undefined);
  mockDelete.mockReset().mockResolvedValue({ photoDeleted: false });
  mockScrub.mockReset().mockResolvedValue(false);
});

async function callRoute(): Promise<Response> {
  const { POST } = await import("../route");
  return POST(new Request("http://localhost/api/cron/cleanup", { method: "POST" }));
}

describe("/api/cron/cleanup", () => {
  it("returns 401 when unauthorized", async () => {
    mockAuth.mockReturnValueOnce(false);
    const res = await callRoute();
    expect(res.status).toBe(401);
    expect(mockList).not.toHaveBeenCalled();
  });

  it("expires pending older than 14d, deletes expired older than 30d, scrubs photos for paid older than 90d", async () => {
    mockAuth.mockReturnValueOnce(true);
    mockList
      .mockResolvedValueOnce([makeSubmission({ _id: "p1" }), makeSubmission({ _id: "p2" })])
      .mockResolvedValueOnce([
        makeSubmission({ _id: "e1", status: "expired", photoR2Key: "k1" }),
        makeSubmission({ _id: "e2", status: "expired" }),
      ])
      .mockResolvedValueOnce([
        makeSubmission({ _id: "x1", status: "paid", photoR2Key: "kx" }),
      ]);
    mockDelete
      .mockResolvedValueOnce({ photoDeleted: true })
      .mockResolvedValueOnce({ photoDeleted: false });
    mockScrub.mockResolvedValueOnce(true);

    const res = await callRoute();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ expired: 2, deleted: 2, photosDeleted: 2 });

    expect(mockList).toHaveBeenNthCalledWith(1, "pending", expect.any(String));
    expect(mockList).toHaveBeenNthCalledWith(2, "expired", expect.any(String));
    expect(mockList).toHaveBeenNthCalledWith(3, "paid", expect.any(String));

    expect(mockMarkExpired).toHaveBeenCalledTimes(2);
    expect(mockMarkExpired).toHaveBeenNthCalledWith(1, "p1", { expiredAt: expect.any(String) });
    expect(mockDelete).toHaveBeenCalledTimes(2);
    expect(mockScrub).toHaveBeenCalledTimes(1);
  });

  it("uses ISO cutoffs spaced ~14/30/90 days apart", async () => {
    mockAuth.mockReturnValueOnce(true);
    await callRoute();

    const cutoffPending = mockList.mock.calls[0][1];
    const cutoffExpired = mockList.mock.calls[1][1];
    const cutoffPaid = mockList.mock.calls[2][1];

    const pendingMs = Date.now() - new Date(cutoffPending).getTime();
    const expiredMs = Date.now() - new Date(cutoffExpired).getTime();
    const paidMs = Date.now() - new Date(cutoffPaid).getTime();

    const day = 24 * 60 * 60 * 1000;
    expect(pendingMs).toBeGreaterThan(13 * day);
    expect(pendingMs).toBeLessThan(15 * day);
    expect(expiredMs).toBeGreaterThan(29 * day);
    expect(expiredMs).toBeLessThan(31 * day);
    expect(paidMs).toBeGreaterThan(89 * day);
    expect(paidMs).toBeLessThan(91 * day);
  });
});
