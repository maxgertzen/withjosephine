import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/listenToken", () => ({
  verifyListenToken: vi.fn(),
}));

vi.mock("@/lib/booking/submissions", () => ({
  findSubmissionById: vi.fn(),
}));

const notFoundMock = vi.fn(() => {
  throw new Error("__notfound__");
});

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

import type { SubmissionRecord } from "@/lib/booking/submissions";
import { findSubmissionById } from "@/lib/booking/submissions";
import { verifyListenToken } from "@/lib/listenToken";

const mockVerify = vi.mocked(verifyListenToken);
const mockFind = vi.mocked(findSubmissionById);

const SUBMISSION: SubmissionRecord = {
  _id: "sub_1",
  status: "paid",
  email: "client@example.com",
  responses: [],
  createdAt: "2026-04-22T12:00:00Z",
  paidAt: "2026-04-22T12:00:00Z",
  deliveredAt: "2026-04-29T12:00:00Z",
  voiceNoteUrl: "https://images.withjosephine.com/voice.m4a",
  pdfUrl: "https://images.withjosephine.com/reading.pdf",
  reading: { name: "Soul Blueprint", priceDisplay: "$179" },
};

beforeEach(() => {
  mockVerify.mockReset();
  mockFind.mockReset();
  notFoundMock.mockClear();
});

async function callPage(token: string) {
  const { default: Page } = await import("./page");
  return Page({ params: Promise.resolve({ token }) });
}

describe("ListenPage gating", () => {
  it("404s when token verification fails", async () => {
    mockVerify.mockResolvedValueOnce({ valid: false });
    await expect(callPage("forged")).rejects.toThrow("__notfound__");
    expect(mockFind).not.toHaveBeenCalled();
  });

  it("404s when submission is not found", async () => {
    mockVerify.mockResolvedValueOnce({ valid: true, submissionId: "sub_1" });
    mockFind.mockResolvedValueOnce(null);
    await expect(callPage("ok")).rejects.toThrow("__notfound__");
  });

  it("404s when submission status is not paid", async () => {
    mockVerify.mockResolvedValueOnce({ valid: true, submissionId: "sub_1" });
    mockFind.mockResolvedValueOnce({ ...SUBMISSION, status: "pending" });
    await expect(callPage("ok")).rejects.toThrow("__notfound__");
  });

  it("404s when deliveredAt is not set", async () => {
    mockVerify.mockResolvedValueOnce({ valid: true, submissionId: "sub_1" });
    mockFind.mockResolvedValueOnce({ ...SUBMISSION, deliveredAt: undefined });
    await expect(callPage("ok")).rejects.toThrow("__notfound__");
  });

  it("404s when both voiceNoteUrl and pdfUrl are missing", async () => {
    mockVerify.mockResolvedValueOnce({ valid: true, submissionId: "sub_1" });
    mockFind.mockResolvedValueOnce({
      ...SUBMISSION,
      voiceNoteUrl: undefined,
      pdfUrl: undefined,
    });
    await expect(callPage("ok")).rejects.toThrow("__notfound__");
  });

  it("renders successfully when token + paid + deliveredAt + assets all present", async () => {
    mockVerify.mockResolvedValueOnce({ valid: true, submissionId: "sub_1" });
    mockFind.mockResolvedValueOnce(SUBMISSION);
    await expect(callPage("ok")).resolves.toBeTruthy();
    expect(notFoundMock).not.toHaveBeenCalled();
  });
});
