import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../r2", () => ({
  deleteObject: vi.fn(),
}));

vi.mock("./persistence/sanityMirror", () => ({
  mirrorAppendEmailFired: vi.fn(),
  mirrorMarkSubmissionListened: vi.fn(),
  mirrorSubmissionCreate: vi.fn(),
  mirrorSubmissionDelete: vi.fn(),
  mirrorSubmissionPatch: vi.fn(),
  mirrorUnsetPhotoKey: vi.fn(),
}));

import { deleteObject } from "../r2";
import * as mirror from "./persistence/sanityMirror";
import {
  appendEmailFired,
  buildSubmissionContext,
  createSubmission,
  deleteSubmissionAndPhoto,
  findSubmissionById,
  markSubmissionPaid,
  scheduleListenedAtMirror,
  scrubSubmissionPhoto,
  type SubmissionRecord,
} from "./submissions";

const mockDeleteObject = vi.mocked(deleteObject);
const mockMirrorCreate = vi.mocked(mirror.mirrorSubmissionCreate);
const mockMirrorPatch = vi.mocked(mirror.mirrorSubmissionPatch);
const mockMirrorAppend = vi.mocked(mirror.mirrorAppendEmailFired);
const mockMirrorDelete = vi.mocked(mirror.mirrorSubmissionDelete);
const mockMirrorUnsetPhoto = vi.mocked(mirror.mirrorUnsetPhotoKey);
const mockMirrorMarkListened = vi.mocked(mirror.mirrorMarkSubmissionListened);

const SUBMISSION_INPUT = {
  id: "sub_1",
  email: "ada@example.com",
  status: "pending" as const,
  readingSlug: "soul-blueprint",
  readingName: "Soul Blueprint",
  readingPriceDisplay: "$179",
  responses: [
    {
      fieldKey: "first_name",
      fieldLabelSnapshot: "First name",
      fieldType: "shortText",
      value: "Ada",
    },
  ],
  consentLabel: "I acknowledge",
  photoR2Key: "submissions/sub_1/photo.jpg",
  createdAt: "2026-04-20T10:00:00Z",
  consentAcknowledgedAt: "2026-04-20T10:00:00Z",
  ipAddress: "1.2.3.4",
};

beforeEach(() => {
  mockDeleteObject.mockReset().mockResolvedValue(undefined);
  mockMirrorCreate.mockReset().mockResolvedValue(undefined);
  mockMirrorPatch.mockReset().mockResolvedValue(undefined);
  mockMirrorAppend.mockReset().mockResolvedValue(undefined);
  mockMirrorDelete.mockReset().mockResolvedValue(undefined);
  mockMirrorUnsetPhoto.mockReset().mockResolvedValue(undefined);
  mockMirrorMarkListened.mockReset().mockResolvedValue(undefined);
});

async function flushFireAndForget() {
  // void mirror calls fire microtasks; await one tick so they settle.
  await Promise.resolve();
  await Promise.resolve();
}

describe("submissions wrapper (D1 source + Sanity mirror)", () => {
  it("createSubmission writes to D1 and triggers Sanity mirror create", async () => {
    await createSubmission(SUBMISSION_INPUT);
    await flushFireAndForget();

    const record = await findSubmissionById("sub_1");
    expect(record?._id).toBe("sub_1");
    expect(mockMirrorCreate).toHaveBeenCalledOnce();
    const [input, ackAt, ip] = mockMirrorCreate.mock.calls[0]!;
    expect(input.id).toBe("sub_1");
    expect(input.email).toBe("ada@example.com");
    expect(ackAt).toBe("2026-04-20T10:00:00Z");
    expect(ip).toBe("1.2.3.4");
  });

  it("markSubmissionPaid updates D1 and triggers mirror patch", async () => {
    await createSubmission(SUBMISSION_INPUT);
    await markSubmissionPaid("sub_1", {
      stripeEventId: "evt_1",
      stripeSessionId: "cs_1",
      paidAt: "2026-04-21T10:00:00Z",
      amountPaidCents: 12900,
      amountPaidCurrency: "usd",
    });
    await flushFireAndForget();

    const record = await findSubmissionById("sub_1");
    expect(record?.status).toBe("paid");
    expect(mockMirrorPatch).toHaveBeenCalledWith(
      "sub_1",
      expect.objectContaining({ status: "paid", paidAt: "2026-04-21T10:00:00Z" }),
    );
  });

  it("appendEmailFired writes to D1 and triggers mirror append", async () => {
    await createSubmission(SUBMISSION_INPUT);
    const entry = {
      type: "order_confirmation" as const,
      sentAt: "2026-04-21T10:00:00Z",
      resendId: "msg_1",
    };
    await appendEmailFired("sub_1", entry);
    await flushFireAndForget();

    const record = await findSubmissionById("sub_1");
    expect(record?.emailsFired).toEqual([entry]);
    expect(mockMirrorAppend).toHaveBeenCalledWith("sub_1", entry);
  });

  it("deleteSubmissionAndPhoto removes the submission and the R2 photo", async () => {
    await createSubmission(SUBMISSION_INPUT);
    const result = await deleteSubmissionAndPhoto({
      _id: "sub_1",
      photoR2Key: "submissions/sub_1/photo.jpg",
    });
    await flushFireAndForget();

    expect(result).toEqual({ photoDeleted: true });
    expect(mockDeleteObject).toHaveBeenCalledWith("submissions/sub_1/photo.jpg");
    expect(await findSubmissionById("sub_1")).toBeNull();
    expect(mockMirrorDelete).toHaveBeenCalledWith("sub_1");
  });

  it("deleteSubmissionAndPhoto still removes the submission when R2 fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await createSubmission(SUBMISSION_INPUT);
    mockDeleteObject.mockRejectedValueOnce(new Error("R2 down"));

    const result = await deleteSubmissionAndPhoto({
      _id: "sub_1",
      photoR2Key: "submissions/sub_1/photo.jpg",
    });
    await flushFireAndForget();

    expect(result).toEqual({ photoDeleted: false });
    expect(await findSubmissionById("sub_1")).toBeNull();
  });

  it("scrubSubmissionPhoto deletes R2 + clears photoR2Key + mirrors", async () => {
    await createSubmission(SUBMISSION_INPUT);
    const result = await scrubSubmissionPhoto({
      _id: "sub_1",
      photoR2Key: "submissions/sub_1/photo.jpg",
    });
    await flushFireAndForget();

    expect(result).toBe(true);
    const record = await findSubmissionById("sub_1");
    expect(record?.photoR2Key).toBeUndefined();
    expect(mockMirrorUnsetPhoto).toHaveBeenCalledWith("sub_1");
  });

  it("scrubSubmissionPhoto returns false when no key", async () => {
    const result = await scrubSubmissionPhoto({ _id: "sub_x" });
    expect(result).toBe(false);
    expect(mockDeleteObject).not.toHaveBeenCalled();
  });

  it("scheduleListenedAtMirror delegates to the Sanity setIfMissing mirror", async () => {
    scheduleListenedAtMirror("sub_42", "2026-05-10T12:00:00Z");
    await flushFireAndForget();
    expect(mockMirrorMarkListened).toHaveBeenCalledWith("sub_42", "2026-05-10T12:00:00Z");
  });
});

describe("buildSubmissionContext", () => {
  const SUBMISSION: SubmissionRecord = {
    _id: "sub_1",
    status: "paid",
    email: "client@example.com",
    responses: [
      {
        fieldKey: "first_name",
        fieldLabelSnapshot: "First name",
        fieldType: "shortText",
        value: "Ada",
      },
    ],
    photoR2Key: "submissions/sub_1/photo.jpg",
    createdAt: "2026-04-20T10:00:00Z",
    reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$179" },
    amountPaidCents: null,
    amountPaidCurrency: null,
    recipientUserId: null,
  };

  it("builds Resend context with photo URL and firstName extracted", () => {
    const ctx = buildSubmissionContext(SUBMISSION);
    expect(ctx.id).toBe("sub_1");
    expect(ctx.firstName).toBe("Ada");
    expect(ctx.readingName).toBe("Soul Blueprint");
    expect(ctx.photoUrl).toBe("https://images.withjosephine.com/submissions/sub_1/photo.jpg");
  });

  it("falls back to legal_full_name first token", () => {
    const ctx = buildSubmissionContext({
      ...SUBMISSION,
      responses: [
        {
          fieldKey: "legal_full_name",
          fieldLabelSnapshot: "Legal full name",
          fieldType: "shortText",
          value: "Ada Lovelace",
        },
      ],
    });
    expect(ctx.firstName).toBe("Ada");
  });

  it("falls back to 'there' when no name response present", () => {
    const ctx = buildSubmissionContext({ ...SUBMISSION, responses: [] });
    expect(ctx.firstName).toBe("there");
  });

  it("returns null photoUrl when no R2 key", () => {
    const ctx = buildSubmissionContext({ ...SUBMISSION, photoR2Key: undefined });
    expect(ctx.photoUrl).toBeNull();
  });

  it("falls back to default reading copy when reading is null", () => {
    const ctx = buildSubmissionContext({ ...SUBMISSION, reading: null });
    expect(ctx.readingName).toBe("your reading");
  });
});
