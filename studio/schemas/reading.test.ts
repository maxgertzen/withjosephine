import { describe, expect, it, vi } from "vitest";

vi.mock("sanity", () => ({
  defineField: <T,>(field: T) => field,
  defineType: <T,>(type: T) => type,
}));

vi.mock("../../src/lib/pricing", () => ({
  parseDisplayToCents: () => null,
}));

import { reading } from "./reading";

type ValidationRule = {
  required?: () => ValidationRule;
  custom?: (fn: (value: unknown, context?: unknown) => unknown) => ValidationRule;
  min?: (n: number) => ValidationRule;
};

type FieldDef = {
  name: string;
  type: string;
  validation?: (rule: ValidationRule) => ValidationRule;
};

const fields = reading.fields as FieldDef[];
const nameField = fields.find((f) => f.name === "name");

function extractCustomValidator(
  field: FieldDef,
): ((value: unknown) => unknown) | null {
  if (!field.validation) return null;

  let capturedCustom: ((value: unknown) => unknown) | null = null;

  const rule: ValidationRule = {
    required: () => rule,
    min: () => rule,
    custom: (fn) => {
      capturedCustom = fn as (value: unknown) => unknown;
      return rule;
    },
  };

  field.validation(rule);
  return capturedCustom;
}

describe("reading schema — name field article validation", () => {
  it("defines a name field", () => {
    expect(nameField).toBeDefined();
    expect(nameField?.type).toBe("string");
  });

  it("rejects titles starting with 'The '", () => {
    const validator = extractCustomValidator(nameField!);
    expect(validator).not.toBeNull();

    const result = validator!("The Soul Blueprint") as { level: string; message: string };
    expect(result.level).toBe("error");
    expect(result.message).toMatch(/article/i);
    expect(result.message).toContain("Soul Blueprint");
  });

  it("rejects titles starting with 'A ' (case-insensitive)", () => {
    const validator = extractCustomValidator(nameField!);
    const result = validator!("a Reading") as { level: string; message: string };
    expect(result.level).toBe("error");
  });

  it("rejects titles starting with 'An '", () => {
    const validator = extractCustomValidator(nameField!);
    const result = validator!("An Akashic Record Reading") as { level: string; message: string };
    expect(result.level).toBe("error");
    expect(result.message).toContain("Akashic Record Reading");
  });

  it("accepts titles without a leading article", () => {
    const validator = extractCustomValidator(nameField!);
    expect(validator!("Soul Blueprint")).toBe(true);
    expect(validator!("Birth Chart Reading")).toBe(true);
    expect(validator!("Akashic Record Reading")).toBe(true);
    expect(validator!("Theory of Everything")).toBe(true);
    expect(validator!("Announcement")).toBe(true);
    expect(validator!("Another Reading")).toBe(true);
  });

  it("passes through when value is not a string (defers to required())", () => {
    const validator = extractCustomValidator(nameField!);
    expect(validator!(undefined)).toBe(true);
    expect(validator!(null)).toBe(true);
    expect(validator!(42)).toBe(true);
  });

  it("error message includes the stripped suggestion", () => {
    const validator = extractCustomValidator(nameField!);
    const result = validator!("The Birth Chart Reading") as { message: string };
    expect(result.message).toContain("Birth Chart Reading");
    expect(result.message).not.toMatch(/^The /);
  });
});
