import { describe, expect, it } from "vitest";

import {
  isNameFollowupEnabled,
  isNameFollowupKey,
  nameFollowupKey,
  nameFollowupOptionValue,
  statusLineFor,
} from "./nameFollowup";

describe("nameFollowup helpers", () => {
  it("builds and parses name-followup keys symmetrically", () => {
    const key = nameFollowupKey("soul_contract_name");
    expect(key).toBe("name_followup_soul_contract_name");
    expect(isNameFollowupKey(key)).toBe(true);
    expect(nameFollowupOptionValue(key)).toBe("soul_contract_name");
  });

  it("rejects unrelated keys", () => {
    expect(isNameFollowupKey("email")).toBe(false);
    expect(isNameFollowupKey("legal_full_name")).toBe(false);
  });

  it("flags enabled name-followup option", () => {
    expect(
      isNameFollowupEnabled({
        value: "x",
        label: "x",
        nameFollowup: { enabled: true },
      }),
    ).toBe(true);
  });

  it("treats absent or disabled name-followup as disabled", () => {
    expect(isNameFollowupEnabled({ value: "x", label: "x" })).toBe(false);
    expect(
      isNameFollowupEnabled({
        value: "x",
        label: "x",
        nameFollowup: { enabled: false },
      }),
    ).toBe(false);
  });
});

describe("statusLineFor", () => {
  it("renders the begin prompt at zero", () => {
    expect(statusLineFor(0, 3)).toBe("Choose three to begin.");
  });

  it("renders one-chosen with remaining count", () => {
    expect(statusLineFor(1, 3)).toBe("One chosen — two to go.");
  });

  it("renders two-chosen with remaining count", () => {
    expect(statusLineFor(2, 3)).toBe("Two chosen — one to go.");
  });

  it("renders the all-chosen line at the limit", () => {
    expect(statusLineFor(3, 3)).toBe("Three chosen.");
  });
});
