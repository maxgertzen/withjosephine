import { describe, expect, it, vi } from "vitest";

vi.mock("sanity", () => ({
  defineField: <T,>(field: T) => field,
  defineType: <T,>(type: T) => type,
}));

vi.mock("@sanity/ui", () => ({}));

vi.mock("../components/PhotoR2Preview", () => ({
  PhotoR2Preview: () => null,
}));

const { submission } = await import("./submission");

type FieldDef = {
  name: string;
  type: string;
  options?: { list?: Array<{ value: string }> };
  of?: Array<{
    fields?: Array<FieldDef>;
  }>;
};

const fields = submission.fields as Array<FieldDef>;
const findField = (name: string) => fields.find((f) => f.name === name);

describe("submission schema — drift fixes from 2026-05-20 smoke walk (S1 + S2)", () => {
  it("declares giftClaimedAt as a datetime field", () => {
    const field = findField("giftClaimedAt");
    expect(field).toBeDefined();
    expect(field?.type).toBe("datetime");
  });

  it("declares recipientUserId as a string field", () => {
    const field = findField("recipientUserId");
    expect(field).toBeDefined();
    expect(field?.type).toBe("string");
  });

  it("includes recipient_intake_received in the emailsFired type enum", () => {
    const emailsFired = findField("emailsFired");
    expect(emailsFired).toBeDefined();
    const typeField = emailsFired?.of?.[0]?.fields?.find(
      (f) => f.name === "type",
    );
    const values = typeField?.options?.list?.map((entry) => entry.value) ?? [];
    expect(values).toContain("recipient_intake_received");
  });
});
