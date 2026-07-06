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
  mockSetIfMissing.mockReset().mockReturnValue({ insert: mockInsert, commit: mockCommit });
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

describe("mirrorMarkSubmissionPdfDownloaded — first-write-wins via setIfMissing", () => {
  it("commits the pdfDownloadedAt through setIfMissing so the earliest download wins", async () => {
    const { mirrorMarkSubmissionPdfDownloaded } = await import("./sanityMirror");
    await mirrorMarkSubmissionPdfDownloaded("sub_1", "2026-06-01T10:00:00.000Z");
    expect(mockPatch).toHaveBeenCalledWith("sub_1");
    expect(mockSetIfMissing).toHaveBeenCalledWith({
      pdfDownloadedAt: "2026-06-01T10:00:00.000Z",
    });
    expect(mockSet).not.toHaveBeenCalled();
    expect(mockCommit).toHaveBeenCalledWith({ visibility: "async" });
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

  it("throws at runtime if a type-bypassing caller passes art9 without readingSlug", async () => {
    const { mirrorSubmissionPatch } = await import("./sanityMirror");
    await expect(
      mirrorSubmissionPatch("sub_bypass", {
        art9AcknowledgedAt: "2026-06-01T10:00:00.000Z",
      } as never),
    ).rejects.toThrow(/readingSlug/);
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

describe("findReadingRef cache TTL (35txg0an)", () => {
  it("caches the first lookup, serves the second from cache within TTL, refetches after expiry", async () => {
    const { findReadingRef, clearReadingRefCache } = await import("./sanityMirror");
    clearReadingRefCache();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ _id: "reading-akashic-v1" })
      .mockResolvedValueOnce({ _id: "reading-akashic-v2" });
    const fakeClient = { fetch: fetchMock } as unknown as Parameters<typeof findReadingRef>[0];

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));

    try {
      const first = await findReadingRef(fakeClient, "akashic-record");
      expect(first).toEqual({ _type: "reference", _ref: "reading-akashic-v1" });
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const cached = await findReadingRef(fakeClient, "akashic-record");
      expect(cached).toEqual({ _type: "reference", _ref: "reading-akashic-v1" });
      expect(fetchMock).toHaveBeenCalledTimes(1);

      vi.setSystemTime(new Date("2026-06-01T12:06:00Z"));

      const refetched = await findReadingRef(fakeClient, "akashic-record");
      expect(refetched).toEqual({ _type: "reference", _ref: "reading-akashic-v2" });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
      clearReadingRefCache();
    }
  });

  it("coalesces concurrent first-time misses on the same slug into a single fetch", async () => {
    const { findReadingRef, clearReadingRefCache } = await import("./sanityMirror");
    clearReadingRefCache();

    let resolveFetch: (value: { _id: string }) => void = () => {};
    const pending = new Promise<{ _id: string }>((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = vi.fn().mockReturnValue(pending);
    const fakeClient = { fetch: fetchMock } as unknown as Parameters<typeof findReadingRef>[0];

    const [first, second] = [
      findReadingRef(fakeClient, "akashic-record"),
      findReadingRef(fakeClient, "akashic-record"),
    ];

    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch({ _id: "reading-akashic-v1" });
    const [a, b] = await Promise.all([first, second]);

    expect(a).toEqual({ _type: "reference", _ref: "reading-akashic-v1" });
    expect(b).toEqual({ _type: "reference", _ref: "reading-akashic-v1" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("drops the cache entry when the fetch resolves null so the next call retries", async () => {
    const { findReadingRef, clearReadingRefCache } = await import("./sanityMirror");
    clearReadingRefCache();

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: "reading-akashic-v1" });
    const fakeClient = { fetch: fetchMock } as unknown as Parameters<typeof findReadingRef>[0];

    const first = await findReadingRef(fakeClient, "akashic-record");
    expect(first).toBeNull();

    const second = await findReadingRef(fakeClient, "akashic-record");
    expect(second).toEqual({ _type: "reference", _ref: "reading-akashic-v1" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("clearReadingRefCache forces the next call to re-fetch from Sanity", async () => {
    const { findReadingRef, clearReadingRefCache } = await import("./sanityMirror");
    clearReadingRefCache();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ _id: "reading-birth-v1" })
      .mockResolvedValueOnce({ _id: "reading-birth-v2" });
    const fakeClient = { fetch: fetchMock } as unknown as Parameters<typeof findReadingRef>[0];

    const first = await findReadingRef(fakeClient, "birth-chart");
    expect(first?._ref).toBe("reading-birth-v1");

    clearReadingRefCache();

    const refetched = await findReadingRef(fakeClient, "birth-chart");
    expect(refetched?._ref).toBe("reading-birth-v2");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
