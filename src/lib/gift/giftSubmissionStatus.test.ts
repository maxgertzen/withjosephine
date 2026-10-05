import { describe, expect, it } from "vitest";

import { isGiftSubmissionStatus } from "./giftSubmissionStatus";

describe("isGiftSubmissionStatus", () => {
  it.each(["gift_waiting", "gift_cancelled"])("is true for %s", (status) => {
    expect(isGiftSubmissionStatus(status)).toBe(true);
  });

  it.each(["pending", "paid", "expired", "gift", "", undefined, null])("is false for %s", (status) => {
    expect(isGiftSubmissionStatus(status)).toBe(false);
  });
});
