import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { patchSingleton, setIfMatchesDefault } from "./seedSingleton.mts";

const mockFetch = vi.fn();
const mockSet = vi.fn();
const mockCommit = vi.fn();
const mockPatch = vi.fn();

vi.mock("./sanity-write-client.mts", () => ({
  sanityWriteClient: () => ({
    fetch: mockFetch,
    patch: mockPatch,
  }),
}));

beforeEach(() => {
  vi.stubEnv("SANITY_WRITE_TOKEN", "token-for-tests");
  mockFetch.mockReset();
  mockCommit.mockReset().mockResolvedValue(undefined);
  mockSet.mockReset().mockReturnValue({ commit: mockCommit });
  mockPatch.mockReset().mockImplementation(() => ({ set: mockSet }));
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("patchSingleton (qqfj212c)", () => {
  it("returns null and skips the patch builder when the singleton is missing", async () => {
    mockFetch.mockResolvedValueOnce(null);
    const mutate = vi.fn();

    const result = await patchSingleton({
      docType: "missingSingleton",
      projection: "{_id, heading}",
      mutate,
      logPrefix: "test",
    });

    expect(result).toBeNull();
    expect(mutate).not.toHaveBeenCalled();
    expect(mockPatch).not.toHaveBeenCalled();
  });

  it("returns the projected doc without committing when mutate returns null", async () => {
    const doc = { _id: "doc1", heading: "Hello" };
    mockFetch.mockResolvedValueOnce(doc);

    const result = await patchSingleton({
      docType: "fakeSingleton",
      projection: "{_id, heading}",
      mutate: () => null,
      logPrefix: "test",
    });

    expect(result).toEqual(doc);
    expect(mockPatch).toHaveBeenCalledWith("doc1");
    expect(mockCommit).not.toHaveBeenCalled();
  });

  it("commits the patch returned by mutate", async () => {
    const doc = { _id: "doc1", heading: "Hello" };
    mockFetch.mockResolvedValueOnce(doc);

    const result = await patchSingleton({
      docType: "fakeSingleton",
      projection: "{_id, heading}",
      mutate: (patch) => patch.set({ heading: "Hola" }),
      logPrefix: "test",
    });

    expect(result).toEqual(doc);
    expect(mockSet).toHaveBeenCalledWith({ heading: "Hola" });
    expect(mockCommit).toHaveBeenCalledOnce();
  });
});

describe("setIfMatchesDefault (qqfj212c)", () => {
  it("rewrites the field when the current value equals oldValue", async () => {
    mockFetch.mockResolvedValueOnce({ _id: "doc1", heading: "Stale" });

    const changed = await setIfMatchesDefault({
      docType: "fakeSingleton",
      fieldName: "heading",
      oldValue: "Stale",
      newValue: "Fresh",
      logPrefix: "test",
    });

    expect(changed).toBe(true);
    expect(mockSet).toHaveBeenCalledWith({ heading: "Fresh" });
    expect(mockCommit).toHaveBeenCalledOnce();
  });

  it("preserves a Becky-edited value that has diverged from the default", async () => {
    mockFetch.mockResolvedValueOnce({ _id: "doc1", heading: "Becky's words" });

    const changed = await setIfMatchesDefault({
      docType: "fakeSingleton",
      fieldName: "heading",
      oldValue: "Stale",
      newValue: "Fresh",
      logPrefix: "test",
    });

    expect(changed).toBe(false);
    expect(mockSet).not.toHaveBeenCalled();
    expect(mockCommit).not.toHaveBeenCalled();
  });

  it("returns false when the singleton is missing from the dataset", async () => {
    mockFetch.mockResolvedValueOnce(null);

    const changed = await setIfMatchesDefault({
      docType: "missingSingleton",
      fieldName: "heading",
      oldValue: "Stale",
      newValue: "Fresh",
      logPrefix: "test",
    });

    expect(changed).toBe(false);
    expect(mockPatch).not.toHaveBeenCalled();
  });
});
