import { describe, expect, it } from "vitest";

import { prepareGiftEmailFailurePreview } from "./giftEmailFailurePreview";

describe("prepareGiftEmailFailurePreview", () => {
  it("names the gift email, what happened, the attempt, time and who it was for", () => {
    const preview = prepareGiftEmailFailurePreview({
      emailType: "gift_send",
      kind: "bounced",
      recipient: "recipient",
      attemptNumber: 1,
      failedAt: "2026-10-04T12:00:00.000Z",
    });

    expect(preview.title).toBe("Gift email: Bounced");
    expect(preview.subtitle).toMatch(/^Attempt 1, \d{1,2} Oct 2026, \d{2}:\d{2}, to the recipient$/);
  });

  it("says to the buyer for buyer emails", () => {
    expect(
      prepareGiftEmailFailurePreview({ emailType: "gift_opened", kind: "send_error", recipient: "buyer" }),
    ).toEqual({ title: "Gift opened: Not sent: Resend returned an error", subtitle: "Attempt 1, to the buyer" });
  });

  it("never shows a value that is not a known role", () => {
    expect(
      prepareGiftEmailFailurePreview({ emailType: "gift_confirmation", recipient: "dana@email.com" }).subtitle,
    ).toBe("Attempt 1");
  });
});
