import { beforeEach, describe, expect, it, vi } from "vitest";

const mockInsert = vi.fn();
const mockSetIfMissing = vi.fn();
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
  mockPatch.mockReset().mockReturnValue({ setIfMissing: mockSetIfMissing });
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
