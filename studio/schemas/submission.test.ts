import { describe, expect, it, vi } from "vitest";

vi.mock("sanity", () => ({
  defineField: <T,>(field: T) => field,
  defineType: <T,>(type: T) => type,
}));

vi.mock("@sanity/ui", () => ({}));

vi.mock("../components/PhotoR2Preview", () => ({
  PhotoR2Preview: () => null,
}));

import { submission } from "./submission";

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

describe("submission schema", () => {
  it("declares recipientUserId as a string field", () => {
    const field = findField("recipientUserId");
    expect(field).toBeDefined();
    expect(field?.type).toBe("string");
  });
});
