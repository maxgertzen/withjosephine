import { afterEach, describe, expect, it, vi } from "vitest";

import { withLocalStorage } from "./browserStorage";
import { blockBrowserStorage, blockBrowserStorageProperty } from "./test-helpers";

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("withLocalStorage", () => {
  it("runs against window.localStorage", () => {
    window.localStorage.setItem("k", "v");
    expect(withLocalStorage((storage) => storage.getItem("k"), null)).toBe("v");
  });

  it.each([
    ["the storage property throws", blockBrowserStorageProperty],
    ["a storage method throws", blockBrowserStorage],
  ])("returns the fallback when %s", (_case, block) => {
    block();
    expect(withLocalStorage((storage) => storage.getItem("k"), "fallback")).toBe("fallback");
  });
});
