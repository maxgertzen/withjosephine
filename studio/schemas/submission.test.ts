import { describe, expect, it, vi } from "vitest";

vi.mock("sanity", () => ({
  defineField: <T,>(field: T) => field,
  defineType: <T,>(type: T) => type,
}));

vi.mock("@sanity/ui", () => ({}));

vi.mock("../components/PhotoR2Preview", () => ({
  PhotoR2Preview: () => null,
}));

import { giftEmailFailure } from "./giftEmailFailure";
import { requireEmailUnlessGift, submission } from "./submission";

type FieldDef = {
  name: string;
  title?: string;
  type: string;
  readOnly?: boolean;
  hidden?: (context: { document?: { status?: string } }) => boolean;
  validation?: (rule: FakeEmailRule) => unknown;
  options?: { list?: Array<{ title: string; value: string }> };
  fields?: Array<FieldDef>;
  of?: Array<{
    type?: string;
    fields?: Array<FieldDef>;
  }>;
};

type FakeEmailRule = {
  email: () => FakeEmailRule;
  custom: (validator: unknown) => FakeEmailRule;
  customValidator?: unknown;
};

function fakeEmailRule(): FakeEmailRule {
  const rule: FakeEmailRule = {
    email: () => rule,
    custom: (validator) => {
      rule.customValidator = validator;
      return rule;
    },
  };
  return rule;
}

const validationContext = (status: string | undefined) =>
  ({ document: { _id: "sub_1", _type: "submission", status } }) as unknown as Parameters<
    typeof requireEmailUnlessGift
  >[1];

const fields = submission.fields as Array<FieldDef>;
const findField = (name: string) => fields.find((f) => f.name === name);

describe("submission schema", () => {
  it("declares recipientUserId as a string field", () => {
    const field = findField("recipientUserId");
    expect(field).toBeDefined();
    expect(field?.type).toBe("string");
  });
});

describe("submission status", () => {
  it("lists the two gift states in Becky's words", () => {
    expect(findField("status")?.options?.list).toEqual(
      expect.arrayContaining([
        { title: "Gift, not opened yet", value: "gift_waiting" },
        { title: "Gift cancelled", value: "gift_cancelled" },
      ]),
    );
  });
});

describe("submission email", () => {
  it("requires the address through requireEmailUnlessGift", () => {
    const rule = fakeEmailRule();
    findField("email")?.validation?.(rule);
    expect(rule.customValidator).toBe(requireEmailUnlessGift);
  });

  it.each(["pending", "paid", "expired", undefined])("is required on a %s submission", (status) => {
    expect(requireEmailUnlessGift(undefined, validationContext(status))).toBe("Required");
  });

  it.each(["gift_waiting", "gift_cancelled"])("is optional on a %s submission", (status) => {
    expect(requireEmailUnlessGift(undefined, validationContext(status))).toBe(true);
  });

  it("passes when the address is present", () => {
    expect(requireEmailUnlessGift("anna@email.com", validationContext("paid"))).toBe(true);
  });
});

describe("submission delivery box", () => {
  it.each([
    ["paid", true],
    ["gift_waiting", true],
    ["pending", false],
    ["expired", false],
    ["gift_cancelled", false],
    [undefined, false],
  ])("on a %s submission, shown is %s", (status, shown) => {
    expect(findField("delivery")?.hidden?.({ document: { status } })).toBe(!shown);
  });
});

describe("submission gift block", () => {
  const giftFields = () => findField("gift")?.fields ?? [];

  it("is read-only and declares only the fields Becky sees, plus the gift record link", () => {
    expect(findField("gift")?.readOnly).toBe(true);
    expect(giftFields().map((field) => field.name)).toEqual([
      "buyerFirstName",
      "boughtAt",
      "sentAt",
      "resendUsed",
      "openedAt",
      "hasNote",
      "emailFailures",
      "giftRecord",
    ]);
  });

  it("labels the fields in Becky's terms", () => {
    const titles = Object.fromEntries(
      giftFields().map((field) => [field.name, field.title]),
    );
    expect(titles).toMatchObject({
      buyerFirstName: "From",
      boughtAt: "Bought",
      sentAt: "Sent by email",
      openedAt: "Opened",
      hasNote: "Note waiting",
    });
  });

  it("stores gift email failures as giftEmailFailure entries", () => {
    const giftFailures = giftFields().find((field) => field.name === "emailFailures");
    expect(giftFailures?.type).toBe("array");
    expect(giftFailures?.of).toEqual([{ type: "giftEmailFailure" }]);
  });
});

describe("giftEmailFailure", () => {
  const failureFields = giftEmailFailure.fields as Array<FieldDef>;

  it("records who it was sent to as a role, never an address", () => {
    expect(failureFields.find((field) => field.name === "recipient")?.options?.list).toEqual([
      { title: "The buyer", value: "buyer" },
      { title: "The recipient", value: "recipient" },
    ]);
  });

  it("has no field that holds an email address", () => {
    for (const field of failureFields) {
      expect(field.type).not.toBe("email");
      expect(field.name).not.toMatch(/(email|address)$/i);
    }
  });

  it("lists only the gift email types", () => {
    expect(
      failureFields.find((field) => field.name === "emailType")?.options?.list?.map((option) => option.value),
    ).toEqual(["gift_confirmation", "gift_send", "gift_opened"]);
  });
});
