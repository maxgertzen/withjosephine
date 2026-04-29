import { describe, expect, it } from "vitest";

import type { SanityFormField } from "@/lib/sanity/types";

import { buildNameFollowupSchema, selectedNameFollowups } from "./nameFollowupSchema";

const QUESTIONS: SanityFormField = {
  _id: "f-questions",
  key: "questions",
  label: "Choose three",
  type: "multiSelectExact",
  multiSelectCount: 3,
  options: [
    { value: "soul_purpose", label: "What is my soul purpose?" },
    {
      value: "rel_contract",
      label: "What is my soul contract with their name?",
      nameFollowup: { enabled: true, label: "Their name" },
    },
    {
      value: "rel_release",
      label: "What can I release with their name?",
      nameFollowup: { enabled: true, label: "Their name" },
    },
  ],
};

describe("selectedNameFollowups", () => {
  it("returns nothing when no options with name-followup are selected", () => {
    const result = selectedNameFollowups([QUESTIONS], { questions: ["soul_purpose"] });
    expect(result).toEqual([]);
  });

  it("returns the selected followup options", () => {
    const result = selectedNameFollowups([QUESTIONS], {
      questions: ["soul_purpose", "rel_contract"],
    });
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("name_followup_rel_contract");
  });
});

describe("buildNameFollowupSchema", () => {
  it("requires non-empty text for each selected followup", () => {
    const schema = buildNameFollowupSchema([QUESTIONS], {
      questions: ["rel_contract"],
    });
    const result = schema.safeParse({ name_followup_rel_contract: "" });
    expect(result.success).toBe(false);
  });

  it("rejects text longer than 80 characters", () => {
    const schema = buildNameFollowupSchema([QUESTIONS], {
      questions: ["rel_contract"],
    });
    const result = schema.safeParse({
      name_followup_rel_contract: "x".repeat(81),
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid name", () => {
    const schema = buildNameFollowupSchema([QUESTIONS], {
      questions: ["rel_contract"],
    });
    const result = schema.safeParse({ name_followup_rel_contract: "Daniel" });
    expect(result.success).toBe(true);
  });

  it("returns an empty schema when no followup options are selected", () => {
    const schema = buildNameFollowupSchema([QUESTIONS], {
      questions: ["soul_purpose"],
    });
    expect(Object.keys(schema.shape)).toEqual([]);
  });
});
