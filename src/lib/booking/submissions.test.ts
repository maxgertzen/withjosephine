import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../r2", () => ({
  deleteObject: vi.fn(),
}));

vi.mock("../sanity/client", () => ({
  getSanityWriteClient: vi.fn(),
}));

import { deleteObject } from "../r2";
import { getSanityWriteClient } from "../sanity/client";
import {
  buildSubmissionContext,
  deleteSubmissionAndPhoto,
  findSubmissionById,
  listSubmissionsByStatusOlderThan,
  markSubmissionExpired,
  markSubmissionPaid,
  scrubSubmissionPhoto,
  type SubmissionRecord,
} from "./submissions";

const mockDeleteObject = vi.mocked(deleteObject);
const mockGetWriteClient = vi.mocked(getSanityWriteClient);

const fetchMock = vi.fn();
const patchSet = vi.fn();
const patchUnset = vi.fn();
const patchCommit = vi.fn();
const deleteMock = vi.fn();

const patchChain = {
  set: patchSet,
  unset: patchUnset,
  commit: patchCommit,
};

beforeEach(() => {
  fetchMock.mockReset();
  patchSet.mockReset().mockReturnValue(patchChain);
  patchUnset.mockReset().mockReturnValue(patchChain);
  patchCommit.mockReset().mockResolvedValue(undefined);
  deleteMock.mockReset().mockResolvedValue(undefined);
  mockDeleteObject.mockReset().mockResolvedValue(undefined);

  mockGetWriteClient.mockReturnValue({
    fetch: fetchMock,
    patch: vi.fn().mockReturnValue(patchChain),
    delete: deleteMock,
  } as never);
});

const SUBMISSION: SubmissionRecord = {
  _id: "sub_1",
  status: "pending",
  email: "client@example.com",
  responses: [
    { fieldKey: "fullName", fieldLabelSnapshot: "Full name", fieldType: "shortText", value: "Ada" },
  ],
  photoR2Key: "submissions/sub_1/photo.jpg",
  clientReferenceId: "sub_1",
  createdAt: "2026-04-28T12:00:00Z",
  reading: { name: "Soul Blueprint", priceDisplay: "$179" },
};

describe("submissions lib", () => {
  describe("findSubmissionById", () => {
    it("returns submission when found", async () => {
      fetchMock.mockResolvedValueOnce(SUBMISSION);
      const result = await findSubmissionById("sub_1");
      expect(result).toEqual(SUBMISSION);
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("_id == $id"), { id: "sub_1" });
    });

    it("returns null when missing", async () => {
      fetchMock.mockResolvedValueOnce(null);
      expect(await findSubmissionById("missing")).toBeNull();
    });
  });

  describe("markSubmissionPaid", () => {
    it("patches paid fields with sync visibility", async () => {
      await markSubmissionPaid("sub_1", {
        stripeEventId: "evt_1",
        stripeSessionId: "cs_1",
        paidAt: "2026-04-28T12:00:00Z",
      });

      expect(patchSet).toHaveBeenCalledWith({
        status: "paid",
        paidAt: "2026-04-28T12:00:00Z",
        stripeEventId: "evt_1",
        stripeSessionId: "cs_1",
      });
      expect(patchCommit).toHaveBeenCalledWith({ visibility: "sync" });
    });
  });

  describe("markSubmissionExpired", () => {
    it("patches status to expired and includes stripeEventId when given", async () => {
      await markSubmissionExpired("sub_1", {
        stripeEventId: "evt_2",
        expiredAt: "2026-04-28T13:00:00Z",
      });
      expect(patchSet).toHaveBeenCalledWith({
        status: "expired",
        expiredAt: "2026-04-28T13:00:00Z",
        stripeEventId: "evt_2",
      });
    });

    it("omits stripeEventId when not given", async () => {
      await markSubmissionExpired("sub_1", { expiredAt: "2026-04-28T13:00:00Z" });
      expect(patchSet).toHaveBeenCalledWith({
        status: "expired",
        expiredAt: "2026-04-28T13:00:00Z",
      });
    });
  });

  describe("listSubmissionsByStatusOlderThan", () => {
    it("queries by status and createdAt cutoff", async () => {
      fetchMock.mockResolvedValueOnce([SUBMISSION]);
      const result = await listSubmissionsByStatusOlderThan("pending", "2026-04-14T00:00:00Z");
      expect(result).toEqual([SUBMISSION]);
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("status == $status"), {
        status: "pending",
        cutoff: "2026-04-14T00:00:00Z",
      });
    });
  });

  describe("deleteSubmissionAndPhoto", () => {
    it("deletes R2 photo then submission doc", async () => {
      const result = await deleteSubmissionAndPhoto({
        _id: "sub_1",
        photoR2Key: "submissions/sub_1/photo.jpg",
      });
      expect(mockDeleteObject).toHaveBeenCalledWith("submissions/sub_1/photo.jpg");
      expect(deleteMock).toHaveBeenCalledWith("sub_1");
      expect(result).toEqual({ photoDeleted: true });
    });

    it("still deletes submission when R2 deletion fails", async () => {
      mockDeleteObject.mockRejectedValueOnce(new Error("R2 down"));
      const result = await deleteSubmissionAndPhoto({
        _id: "sub_1",
        photoR2Key: "submissions/sub_1/photo.jpg",
      });
      expect(deleteMock).toHaveBeenCalledWith("sub_1");
      expect(result).toEqual({ photoDeleted: false });
    });

    it("skips R2 when no photoR2Key", async () => {
      const result = await deleteSubmissionAndPhoto({ _id: "sub_1" });
      expect(mockDeleteObject).not.toHaveBeenCalled();
      expect(deleteMock).toHaveBeenCalledWith("sub_1");
      expect(result).toEqual({ photoDeleted: false });
    });
  });

  describe("scrubSubmissionPhoto", () => {
    it("deletes R2 photo and unsets photoR2Key", async () => {
      const result = await scrubSubmissionPhoto({
        _id: "sub_1",
        photoR2Key: "submissions/sub_1/photo.jpg",
      });
      expect(mockDeleteObject).toHaveBeenCalledWith("submissions/sub_1/photo.jpg");
      expect(patchUnset).toHaveBeenCalledWith(["photoR2Key"]);
      expect(result).toBe(true);
    });

    it("returns false when no photoR2Key", async () => {
      const result = await scrubSubmissionPhoto({ _id: "sub_1" });
      expect(mockDeleteObject).not.toHaveBeenCalled();
      expect(patchUnset).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it("returns false and skips patch when R2 deletion fails", async () => {
      mockDeleteObject.mockRejectedValueOnce(new Error("R2 down"));
      const result = await scrubSubmissionPhoto({
        _id: "sub_1",
        photoR2Key: "submissions/sub_1/photo.jpg",
      });
      expect(patchUnset).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe("buildSubmissionContext", () => {
    it("builds Resend context with photo URL from R2 key", () => {
      const ctx = buildSubmissionContext(SUBMISSION);
      expect(ctx.id).toBe("sub_1");
      expect(ctx.readingName).toBe("Soul Blueprint");
      expect(ctx.readingPriceDisplay).toBe("$179");
      expect(ctx.photoUrl).toBe("https://images.withjosephine.com/submissions/sub_1/photo.jpg");
      expect(ctx.responses).toEqual([
        { fieldLabelSnapshot: "Full name", fieldType: "shortText", value: "Ada" },
      ]);
    });

    it("returns null photoUrl when no R2 key", () => {
      const ctx = buildSubmissionContext({ ...SUBMISSION, photoR2Key: undefined });
      expect(ctx.photoUrl).toBeNull();
    });

    it("falls back to default reading copy when reading is null", () => {
      const ctx = buildSubmissionContext({ ...SUBMISSION, reading: null });
      expect(ctx.readingName).toBe("your reading");
      expect(ctx.readingPriceDisplay).toBe("");
    });
  });
});
