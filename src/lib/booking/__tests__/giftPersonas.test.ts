import { describe, expect, it } from "vitest";

import {
  purchaserSuppliedRecipientName,
  recipientNameFor,
  stripTemplateTags,
} from "../giftPersonas";
import type { SubmissionRecord } from "../submissions";

const BASE_REDEEMED_GIFT: SubmissionRecord = {
  _id: "sub_redeemed",
  status: "paid",
  email: "recipient@example.com",
  responses: [],
  createdAt: "2026-05-20T00:00:00.000Z",
  reading: { slug: "birth-chart", name: "Birth Chart Reading", priceDisplay: "$99" },
  amountPaidCents: 9900,
  amountPaidCurrency: "usd",
  recipientUserId: "user_recipient",
  isGift: true,
  purchaserUserId: "user_purchaser",
  purchaserTimeZone: null,
  recipientEmail: "recipient@example.com",
  giftDeliveryMethod: "scheduled",
  giftSendAt: "2026-05-19T00:00:00.000Z",
  giftMessage: null,
  giftClaimTokenHash: null,
  giftClaimEmailFiredAt: null,
  giftClaimedAt: "2026-05-20T00:00:00.000Z",
  giftCancelledAt: null,
  giftClaimSentNowAt: null,
  giftClaimSentNowActor: null,
  giftClaimPriorAlarmAt: null,
};

// Phase 5 Session 4b — B7.26. Closes the template-tag injection vector.
describe("stripTemplateTags", () => {
  it("strips a single `{tag}` substring", () => {
    expect(stripTemplateTags("Hi {recipientName}, congrats")).toBe("Hi , congrats");
  });

  it("strips multiple `{tag}` substrings", () => {
    expect(
      stripTemplateTags("{purchaserFirstName} sent {recipientName} a gift {amount}"),
    ).toBe("sent  a gift");
  });

  it("strips empty `{}` and unbalanced patterns", () => {
    expect(stripTemplateTags("a {} b")).toBe("a  b");
    expect(stripTemplateTags("a {unclosed")).toBe("a {unclosed");
  });

  it("leaves regular text alone", () => {
    expect(stripTemplateTags("Alice")).toBe("Alice");
    expect(stripTemplateTags("happy birthday <3")).toBe("happy birthday <3");
  });

  it("trims trailing/leading whitespace after stripping", () => {
    expect(stripTemplateTags("{tag}")).toBe("");
    expect(stripTemplateTags("  {tag} hi {tag2}  ")).toBe("hi");
  });
});

describe("purchaserSuppliedRecipientName (9vb4iz95)", () => {
  it("returns the trimmed name when recipient_name is present", () => {
    expect(
      purchaserSuppliedRecipientName({
        responses: [{ fieldKey: "recipient_name", value: "  Mira  " }],
      }),
    ).toBe("Mira");
  });

  it("returns null when no recipient_name response is present", () => {
    expect(
      purchaserSuppliedRecipientName({
        responses: [{ fieldKey: "first_name", value: "Mira" }],
      }),
    ).toBeNull();
  });

  it("returns null when recipient_name is the empty string", () => {
    expect(
      purchaserSuppliedRecipientName({
        responses: [{ fieldKey: "recipient_name", value: "" }],
      }),
    ).toBeNull();
  });

  it("returns null when recipient_name is whitespace-only", () => {
    expect(
      purchaserSuppliedRecipientName({
        responses: [{ fieldKey: "recipient_name", value: "   \t  " }],
      }),
    ).toBeNull();
  });
});

describe("recipientNameFor — post-redeem fallback chain", () => {
  it("returns the purchaser-typed recipient_name when still present (pre-redeem)", () => {
    const submission: SubmissionRecord = {
      ...BASE_REDEEMED_GIFT,
      responses: [
        { fieldKey: "recipient_name", fieldLabelSnapshot: "", fieldType: "text", value: "Mira" },
      ],
    };
    expect(recipientNameFor(submission)).toBe("Mira");
  });

  it("falls back to the recipient's intake first_name when recipient_name was wiped by redeem", () => {
    const submission: SubmissionRecord = {
      ...BASE_REDEEMED_GIFT,
      responses: [
        { fieldKey: "first_name", fieldLabelSnapshot: "", fieldType: "text", value: "Alice" },
        { fieldKey: "legal_full_name", fieldLabelSnapshot: "", fieldType: "text", value: "Alice Brown" },
      ],
    };
    expect(recipientNameFor(submission)).toBe("Alice");
  });

  it("falls back to legal_full_name first token when first_name is missing", () => {
    const submission: SubmissionRecord = {
      ...BASE_REDEEMED_GIFT,
      responses: [
        { fieldKey: "legal_full_name", fieldLabelSnapshot: "", fieldType: "text", value: "Bianca Rossi" },
      ],
    };
    expect(recipientNameFor(submission)).toBe("Bianca");
  });

  it("falls back to email local-part when no intake names are present", () => {
    const submission: SubmissionRecord = {
      ...BASE_REDEEMED_GIFT,
      email: "carmen@example.com",
      responses: [],
    };
    expect(recipientNameFor(submission)).toBe("Carmen");
  });

  it("does not crash when submission.email is undefined and no intake names present (regression: δ broke thank-you page tests)", () => {
    const submission = {
      ...BASE_REDEEMED_GIFT,
      email: undefined,
      responses: [],
    } as unknown as SubmissionRecord;
    expect(() => recipientNameFor(submission)).not.toThrow();
    expect(recipientNameFor(submission)).toBe("there");
  });
});
