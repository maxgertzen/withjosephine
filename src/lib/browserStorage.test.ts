import { afterEach, describe, expect, it, vi } from "vitest";

import { withStorage } from "./browserStorage";
import { blockBrowserStorage, blockBrowserStorageProperty } from "./test-helpers";

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("withStorage", () => {
  it.each(["localStorage", "sessionStorage"] as const)("runs against window.%s", (kind) => {
    window[kind].setItem("k", "v");
    expect(withStorage(kind, (storage) => storage.getItem("k"), null)).toBe("v");
  });

  it.each([
    ["the storage property throws", blockBrowserStorageProperty],
    ["a storage method throws", blockBrowserStorage],
  ])("returns the fallback when %s", (_case, block) => {
    block();
    expect(withStorage("localStorage", (storage) => storage.getItem("k"), "fallback")).toBe(
      "fallback",
    );
    expect(withStorage("sessionStorage", (storage) => storage.getItem("k"), "fallback")).toBe(
      "fallback",
    );
  });
});
