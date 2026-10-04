import { describe, expect, it } from "vitest";

import { prepareEmailFailurePreview } from "./emailFailurePreview";

describe("prepareEmailFailurePreview", () => {
  it("names the email, what happened, the attempt, time and address", () => {
    const preview = prepareEmailFailurePreview({
      emailType: "reading_delivery",
      kind: "bounced",
      recipient: "ada@exmaple.com",
      attemptNumber: 2,
      failedAt: "2026-10-04T12:00:00.000Z",
    });

    expect(preview.title).toBe("Reading delivery: Bounced");
    expect(preview.subtitle).toMatch(/^Attempt 2, \d{1,2} Oct 2026, \d{2}:\d{2}, to ada@exmaple\.com$/);
  });

  it("explains why a resend was refused", () => {
    expect(
      prepareEmailFailurePreview({ emailType: "order_confirmation", kind: "refused", errorCode: "rate_limited" })
        .title,
    ).toBe("Order confirmation: Not sent: already resent 3 times in 24 hours");
  });

  it("says when the email has been sent since", () => {
    expect(
      prepareEmailFailurePreview({
        emailType: "order_confirmation",
        kind: "maybe_sent",
        resolvedAt: "2026-10-04T13:00:00.000Z",
      }),
    ).toEqual({
      title: "Order confirmation: May already have been sent, check Resend",
      subtitle: "Sent since",
    });
  });
});
