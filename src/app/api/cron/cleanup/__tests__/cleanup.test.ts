import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/booking/cron-auth", () => ({
  isCronRequestAuthorized: vi.fn(),
}));

vi.mock("@/lib/booking/submissions", () => ({
  listSubmissionsByStatusOlderThan: vi.fn(),
  listAllReferencedPhotoKeys: vi.fn(),
  markSubmissionExpired: vi.fn(),
  deleteSubmissionAndPhoto: vi.fn(),
  scrubSubmissionPhoto: vi.fn(),
}));

vi.mock("@/lib/r2", () => ({
  listObjectsByPrefix: vi.fn(),
  deleteObject: vi.fn(),
}));

import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import {
  deleteSubmissionAndPhoto,
  listAllReferencedPhotoKeys,
  listSubmissionsByStatusOlderThan,
  markSubmissionExpired,
  scrubSubmissionPhoto,
  type SubmissionRecord,
} from "@/lib/booking/submissions";
import { deleteObject, listObjectsByPrefix } from "@/lib/r2";

const mockAuth = vi.mocked(isCronRequestAuthorized);
const mockList = vi.mocked(listSubmissionsByStatusOlderThan);
const mockMarkExpired = vi.mocked(markSubmissionExpired);
const mockDelete = vi.mocked(deleteSubmissionAndPhoto);
const mockScrub = vi.mocked(scrubSubmissionPhoto);
const mockListReferenced = vi.mocked(listAllReferencedPhotoKeys);
const mockListR2 = vi.mocked(listObjectsByPrefix);
const mockDeleteR2 = vi.mocked(deleteObject);

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
  mockListReferenced.mockReset().mockResolvedValue(new Set());
  mockListR2.mockReset().mockResolvedValue([]);
  mockDeleteR2.mockReset().mockResolvedValue(undefined);
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
    expect(body).toEqual({ expired: 2, deleted: 2, photosDeleted: 2, orphansReaped: 0 });

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

describe("/api/cron/cleanup orphan reaper", () => {
  const HOUR = 60 * 60 * 1000;

  function r2Object(key: string, ageHours: number) {
    return { key, lastModified: new Date(Date.now() - ageHours * HOUR) };
  }

  it("deletes R2 keys older than 24h that no submission references", async () => {
    mockAuth.mockReturnValueOnce(true);
    mockListR2.mockResolvedValueOnce([
      r2Object("submissions/orphan-1/photo-a.jpg", 48),
      r2Object("submissions/orphan-2/photo-b.png", 72),
    ]);
    mockListReferenced.mockResolvedValueOnce(new Set());

    const res = await callRoute();
    const body = await res.json();
    expect(body.orphansReaped).toBe(2);
    expect(mockDeleteR2).toHaveBeenCalledTimes(2);
    expect(mockDeleteR2).toHaveBeenCalledWith("submissions/orphan-1/photo-a.jpg");
    expect(mockDeleteR2).toHaveBeenCalledWith("submissions/orphan-2/photo-b.png");
  });

  it("preserves R2 keys still referenced by a current submission", async () => {
    mockAuth.mockReturnValueOnce(true);
    mockListR2.mockResolvedValueOnce([
      r2Object("submissions/keep/photo.jpg", 200),
      r2Object("submissions/orphan/photo.png", 200),
    ]);
    mockListReferenced.mockResolvedValueOnce(new Set(["submissions/keep/photo.jpg"]));

    const res = await callRoute();
    const body = await res.json();
    expect(body.orphansReaped).toBe(1);
    expect(mockDeleteR2).toHaveBeenCalledOnce();
    expect(mockDeleteR2).toHaveBeenCalledWith("submissions/orphan/photo.png");
  });

  it("preserves R2 keys younger than the 24h grace window", async () => {
    mockAuth.mockReturnValueOnce(true);
    mockListR2.mockResolvedValueOnce([
      r2Object("submissions/just-uploaded/photo.jpg", 1),
      r2Object("submissions/old-orphan/photo.jpg", 200),
    ]);
    mockListReferenced.mockResolvedValueOnce(new Set());

    const res = await callRoute();
    const body = await res.json();
    expect(body.orphansReaped).toBe(1);
    expect(mockDeleteR2).toHaveBeenCalledWith("submissions/old-orphan/photo.jpg");
  });

  it("counts and continues past per-key delete failures", async () => {
    mockAuth.mockReturnValueOnce(true);
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockListR2.mockResolvedValueOnce([
      r2Object("submissions/a/p.jpg", 200),
      r2Object("submissions/b/p.jpg", 200),
    ]);
    mockListReferenced.mockResolvedValueOnce(new Set());
    mockDeleteR2.mockRejectedValueOnce(new Error("R2 down")).mockResolvedValueOnce(undefined);

    const res = await callRoute();
    const body = await res.json();
    expect(body.orphansReaped).toBe(1);
    expect(mockDeleteR2).toHaveBeenCalledTimes(2);
  });
});
