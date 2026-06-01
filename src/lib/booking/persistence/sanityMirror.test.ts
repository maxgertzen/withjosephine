import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MirrorSubmissionPatchInput } from "./sanityMirror";

const mockInsert = vi.fn();
const mockSetIfMissing = vi.fn();
const mockSet = vi.fn();
const mockCommit = vi.fn();
const mockPatch = vi.fn();

vi.mock("@/lib/sanity/client", () => ({
  getSanityWriteClient: vi.fn(() => ({
    patch: mockPatch,
  })),
}));

beforeEach(() => {
  mockCommit.mockReset().mockResolvedValue(undefined);
  mockInsert.mockReset().mockReturnValue({ commit: mockCommit });
  mockSetIfMissing.mockReset().mockReturnValue({ insert: mockInsert });
  mockSet.mockReset().mockReturnValue({ commit: mockCommit });
  mockPatch.mockReset().mockImplementation(() => ({
    setIfMissing: mockSetIfMissing,
    set: mockSet,
  }));
});

describe("mirrorAppendEmailFired — Sanity _key on every array item", () => {
  it("inserts the entry carrying a stable _key derived from type + sentAt", async () => {
    const { mirrorAppendEmailFired } = await import("./sanityMirror");
    await mirrorAppendEmailFired("sub_1", {
      type: "order_confirmation",
      sentAt: "2026-04-21T10:00:00.000Z",
      resendId: "msg_1",
    });
    expect(mockInsert).toHaveBeenCalledOnce();
    const [position, path, items] = mockInsert.mock.calls[0];
    expect(position).toBe("after");
    expect(path).toBe("emailsFired[-1]");
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      _key: "order_confirmation-2026-04-21T10-00-00-000Z",
      type: "order_confirmation",
      sentAt: "2026-04-21T10:00:00.000Z",
      resendId: "msg_1",
    });
  });

  it("derives different keys for entries of the same type sent at different times", async () => {
    const { mirrorAppendEmailFired } = await import("./sanityMirror");
    await mirrorAppendEmailFired("sub_1", {
      type: "day7",
      sentAt: "2026-05-01T09:00:00.000Z",
      resendId: "msg_a",
    });
    await mirrorAppendEmailFired("sub_1", {
      type: "day7",
      sentAt: "2026-05-08T09:00:00.000Z",
      resendId: "msg_b",
    });
    const firstKey = mockInsert.mock.calls[0][2][0]._key;
    const secondKey = mockInsert.mock.calls[1][2][0]._key;
    expect(firstKey).not.toBe(secondKey);
  });

  it("strips characters that aren't valid in a Sanity _key (only [A-Za-z0-9_-])", async () => {
    const { mirrorAppendEmailFired } = await import("./sanityMirror");
    await mirrorAppendEmailFired("sub_1", {
      type: "day7-overdue-alert",
      sentAt: "2026-05-01T09:00:00.000Z",
      resendId: null,
    });
    const key = mockInsert.mock.calls[0][2][0]._key as string;
    expect(key).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe("mirrorSubmissionPatch — art9 requires readingSlug (d5y8qzl5)", () => {
  it("writes the art9 label derived from the provided readingSlug", async () => {
    const { mirrorSubmissionPatch } = await import("./sanityMirror");
    await mirrorSubmissionPatch("sub_art9", {
      art9AcknowledgedAt: "2026-06-01T10:00:00.000Z",
      readingSlug: "akashic-record",
    });
    expect(mockSet).toHaveBeenCalledOnce();
    const setArg = mockSet.mock.calls[0][0] as Record<string, unknown>;
    const art9 = setArg["consentSnapshot.art9Consent"] as {
      labelText: string;
      acknowledgedAt: string;
    };
    expect(art9.labelText).toContain("Akashic Record");
    expect(art9.acknowledgedAt).toBe("2026-06-01T10:00:00.000Z");
  });

  it("rejects patches that include art9 without readingSlug at the type level", () => {
    const ok: MirrorSubmissionPatchInput = {
      art9AcknowledgedAt: "2026-06-01T10:00:00.000Z",
      readingSlug: "akashic-record",
    };
    expect(ok.art9AcknowledgedAt).toBeDefined();

    // @ts-expect-error — art9AcknowledgedAt without readingSlug is rejected
    const bad: MirrorSubmissionPatchInput = {
      art9AcknowledgedAt: "2026-06-01T10:00:00.000Z",
    };
    expect(bad).toBeDefined();
  });
});
