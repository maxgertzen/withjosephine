import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { isMainModule } from "./main.mts";

const SELF_URL = import.meta.url;
const SELF_PATH = fileURLToPath(SELF_URL);

describe("isMainModule (nvbgx1n8)", () => {
  const originalArgv1: string | undefined = process.argv[1];

  afterEach(() => {
    if (originalArgv1 === undefined) {
      (process.argv as Array<string | undefined>).length = 1;
    } else {
      process.argv[1] = originalArgv1;
    }
  });

  it("returns true when argv[1] resolves to the same file as importMetaUrl", () => {
    process.argv[1] = SELF_PATH;
    expect(isMainModule(SELF_URL)).toBe(true);
  });

  it("returns false when argv[1] is a different path", () => {
    process.argv[1] = "/tmp/some-other-script.mjs";
    expect(isMainModule(SELF_URL)).toBe(false);
  });

  it("returns false when argv[1] is undefined", () => {
    (process.argv as Array<string | undefined>)[1] = undefined;
    expect(isMainModule(SELF_URL)).toBe(false);
  });
});
