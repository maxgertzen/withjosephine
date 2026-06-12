import { describe, expect, it, vi, beforeEach } from "vitest";

import { run } from "./migrate-unset-orphan-fields-2026-06-12";

const TARGET_ID = "emailOrderConfirmation";

const mockFetch = vi.fn();
const mockPatch = vi.fn();
const mockUnset = vi.fn();
const mockCommit = vi.fn();

vi.mock("./_lib/sanity-write-client.mts", () => ({
  sanityWriteClient: () => ({
    fetch: mockFetch,
    patch: mockPatch,
  }),
}));

const DOC_WITH_ORPHANS = {
  _id: TARGET_ID,
  _type: "emailOrderConfirmation",
  contactLine: [{ _type: "block" }],
  greeting: "Hello there",
  thanksLine: [{ _type: "block" }],
  timelineLine: [{ _type: "block" }],
};

const DOC_CLEAN = {
  _id: TARGET_ID,
  _type: "emailOrderConfirmation",
};

const DOC_WRONG_TYPE = {
  _id: TARGET_ID,
  _type: "somethingElse",
  greeting: "Hello there",
};

beforeEach(() => {
  vi.resetAllMocks();
  mockUnset.mockReturnValue({ commit: mockCommit });
  mockPatch.mockReturnValue({ unset: mockUnset });
  mockCommit.mockResolvedValue(undefined);
});

describe("run — dry-run (default)", () => {
  it("returns unset with fieldsFound when orphan fields present, no commit", async () => {
    mockFetch.mockResolvedValueOnce(DOC_WITH_ORPHANS);

    const result = await run({ dataset: "staging", dryRun: true });

    expect(result.action).toBe("unset");
    expect(result.fieldsFound).toEqual(["contactLine", "greeting", "thanksLine", "timelineLine"]);
    expect(mockCommit).not.toHaveBeenCalled();
  });

  it("returns skipped when no orphan fields present, no commit", async () => {
    mockFetch.mockResolvedValueOnce(DOC_CLEAN);

    const result = await run({ dataset: "staging", dryRun: true });

    expect(result.action).toBe("skipped");
    expect(result.fieldsFound).toEqual([]);
    expect(mockCommit).not.toHaveBeenCalled();
  });

  it("returns skipped when the doc is not found", async () => {
    mockFetch.mockResolvedValueOnce(null);

    const result = await run({ dataset: "staging", dryRun: true });

    expect(result.action).toBe("skipped");
    expect(result.fieldsFound).toEqual([]);
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it("returns skipped when the _type does not match", async () => {
    mockFetch.mockResolvedValueOnce(DOC_WRONG_TYPE);

    const result = await run({ dataset: "staging", dryRun: true });

    expect(result.action).toBe("skipped");
    expect(result.fieldsFound).toEqual([]);
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it("treats null-valued orphan fields as absent", async () => {
    mockFetch.mockResolvedValueOnce({
      _id: TARGET_ID,
      _type: "emailOrderConfirmation",
      contactLine: null,
      greeting: null,
      thanksLine: null,
      timelineLine: null,
    });

    const result = await run({ dataset: "staging", dryRun: true });

    expect(result.action).toBe("skipped");
    expect(result.fieldsFound).toEqual([]);
  });
});

describe("run — apply mode (idempotency)", () => {
  it("unsets the orphan fields and commits when in apply mode", async () => {
    mockFetch.mockResolvedValueOnce(DOC_WITH_ORPHANS);

    const result = await run({ dataset: "staging", dryRun: false });

    expect(result.action).toBe("unset");
    expect(mockPatch).toHaveBeenCalledWith(TARGET_ID);
    expect(mockUnset).toHaveBeenCalledWith([
      "contactLine",
      "greeting",
      "thanksLine",
      "timelineLine",
    ]);
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });

  it("unsets only the orphan fields that are present", async () => {
    mockFetch.mockResolvedValueOnce({
      _id: TARGET_ID,
      _type: "emailOrderConfirmation",
      greeting: "Hello there",
      thanksLine: [{ _type: "block" }],
    });

    const result = await run({ dataset: "staging", dryRun: false });

    expect(result.action).toBe("unset");
    expect(result.fieldsFound).toEqual(["greeting", "thanksLine"]);
    expect(mockUnset).toHaveBeenCalledWith(["greeting", "thanksLine"]);
    expect(mockCommit).toHaveBeenCalledTimes(1);
  });

  it("idempotent: apply with no orphan fields skips and never commits", async () => {
    mockFetch.mockResolvedValueOnce(DOC_CLEAN);

    const result = await run({ dataset: "staging", dryRun: false });

    expect(result.action).toBe("skipped");
    expect(mockPatch).not.toHaveBeenCalled();
    expect(mockCommit).not.toHaveBeenCalled();
  });

  it("idempotent: a re-run after the first unset (fields now absent) is skipped", async () => {
    mockFetch.mockResolvedValueOnce(DOC_CLEAN);

    const result = await run({ dataset: "staging", dryRun: false });

    expect(result.action).toBe("skipped");
    expect(result.fieldsFound).toEqual([]);
    expect(mockCommit).not.toHaveBeenCalled();
  });
});
