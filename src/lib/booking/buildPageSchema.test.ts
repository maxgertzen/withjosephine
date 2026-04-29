import { describe, expect, it } from "vitest";

import type { SanityFormField } from "@/lib/sanity/types";

import { buildPageSchema } from "./buildPageSchema";

function field(overrides: Partial<SanityFormField>): SanityFormField {
  return {
    _id: overrides.key ?? "x",
    key: "x",
    label: "x",
    type: "shortText",
    required: true,
    ...overrides,
  };
}

describe("buildPageSchema", () => {
  const fields: SanityFormField[] = [
    field({ _id: "1", key: "email", type: "email", required: true }),
    field({ _id: "2", key: "legal_full_name", type: "shortText", required: true }),
    field({ _id: "3", key: "anything_else", type: "longText", required: false }),
  ];

  it("includes only the keys passed as page-field keys", () => {
    const schema = buildPageSchema(fields, ["email", "legal_full_name"]);
    expect(Object.keys(schema.shape)).toEqual(["email", "legal_full_name"]);
  });

  it("returns an empty object when page has no field keys", () => {
    const schema = buildPageSchema(fields, []);
    expect(Object.keys(schema.shape)).toEqual([]);
  });

  it("ignores keys that do not exist among the fields", () => {
    const schema = buildPageSchema(fields, ["email", "nonexistent"]);
    expect(Object.keys(schema.shape)).toEqual(["email"]);
  });

  it("validates a passing payload for the scoped keys only", () => {
    const schema = buildPageSchema(fields, ["email", "legal_full_name"]);
    const result = schema.safeParse({
      email: "jane@example.com",
      legal_full_name: "Jane Doe",
    });
    expect(result.success).toBe(true);
  });

  it("flags an invalid email but ignores fields not on the page", () => {
    const schema = buildPageSchema(fields, ["email"]);
    const result = schema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
  });
});
