import { describe, expect, it } from "vitest";

import type { SanityFormField } from "@/lib/sanity/types";

import { buildSubmissionSchema } from "./submissionSchema";

function field(overrides: Partial<SanityFormField> & Pick<SanityFormField, "type" | "key">): SanityFormField {
  return {
    _id: overrides._id ?? `id-${overrides.key}`,
    key: overrides.key,
    label: overrides.label ?? overrides.key,
    type: overrides.type,
    required: overrides.required,
    options: overrides.options,
    multiSelectCount: overrides.multiSelectCount,
    validation: overrides.validation,
  };
}

describe("buildSubmissionSchema", () => {
  it("requires shortText when required=true", () => {
    const schema = buildSubmissionSchema([field({ key: "name", type: "shortText", required: true })]);
    expect(schema.safeParse({ name: "" }).success).toBe(false);
    expect(schema.safeParse({ name: "Ada" }).success).toBe(true);
  });

  it("allows missing shortText when required=false", () => {
    const schema = buildSubmissionSchema([field({ key: "name", type: "shortText" })]);
    expect(schema.safeParse({}).success).toBe(true);
  });

  it("validates email format", () => {
    const schema = buildSubmissionSchema([field({ key: "email", type: "email", required: true })]);
    expect(schema.safeParse({ email: "not-an-email" }).success).toBe(false);
    expect(schema.safeParse({ email: "client@example.com" }).success).toBe(true);
  });

  it("rejects malformed dates", () => {
    const schema = buildSubmissionSchema([field({ key: "dob", type: "date", required: true })]);
    expect(schema.safeParse({ dob: "12/31/1990" }).success).toBe(false);
    expect(schema.safeParse({ dob: "1990-12-31" }).success).toBe(true);
  });

  it("requires HH:MM for time fields", () => {
    const schema = buildSubmissionSchema([field({ key: "tob", type: "time", required: true })]);
    expect(schema.safeParse({ tob: "7am" }).success).toBe(false);
    expect(schema.safeParse({ tob: "07:30" }).success).toBe(true);
  });

  it("accepts the literal 'unknown' sentinel for time fields", () => {
    const schema = buildSubmissionSchema([field({ key: "tob", type: "time", required: true })]);
    expect(schema.safeParse({ tob: "unknown" }).success).toBe(true);
  });

  it("constrains select to known values", () => {
    const schema = buildSubmissionSchema([
      field({
        key: "tone",
        type: "select",
        required: true,
        options: [
          { value: "warm", label: "Warm" },
          { value: "direct", label: "Direct" },
        ],
      }),
    ]);
    expect(schema.safeParse({ tone: "spicy" }).success).toBe(false);
    expect(schema.safeParse({ tone: "warm" }).success).toBe(true);
  });

  it("enforces exact count for multiSelectExact", () => {
    const schema = buildSubmissionSchema([
      field({
        key: "focus",
        type: "multiSelectExact",
        multiSelectCount: 2,
        options: [
          { value: "love", label: "Love" },
          { value: "career", label: "Career" },
          { value: "purpose", label: "Purpose" },
        ],
      }),
    ]);
    expect(schema.safeParse({ focus: ["love"] }).success).toBe(false);
    expect(schema.safeParse({ focus: ["love", "career", "purpose"] }).success).toBe(false);
    expect(schema.safeParse({ focus: ["love", "career"] }).success).toBe(true);
  });

  it("requires consent literal true", () => {
    const schema = buildSubmissionSchema([field({ key: "agree", type: "consent" })]);
    expect(schema.safeParse({ agree: false }).success).toBe(false);
    expect(schema.safeParse({ agree: true }).success).toBe(true);
  });

  it("requires non-empty file upload key when required", () => {
    const schema = buildSubmissionSchema([field({ key: "photo", type: "fileUpload", required: true })]);
    expect(schema.safeParse({ photo: "" }).success).toBe(false);
    expect(schema.safeParse({ photo: "submissions/x/y.jpg" }).success).toBe(true);
  });

  it("applies minLength/maxLength to short text", () => {
    const schema = buildSubmissionSchema([
      field({
        key: "nick",
        type: "shortText",
        required: true,
        validation: { minLength: 3, maxLength: 8 },
      }),
    ]);
    expect(schema.safeParse({ nick: "ab" }).success).toBe(false);
    expect(schema.safeParse({ nick: "abcdefghi" }).success).toBe(false);
    expect(schema.safeParse({ nick: "abcd" }).success).toBe(true);
  });
});
