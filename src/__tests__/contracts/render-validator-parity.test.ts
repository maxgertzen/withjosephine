import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { derivePairedUnknownKeys } from "@/lib/intake/useIntakeSchema";
import type { SanityFormField, SanityFormSection } from "@/lib/sanity/types";

const RENDERABLE_FIELD_TYPES = new Set<SanityFormField["type"]>([
  "shortText",
  "longText",
  "email",
  "date",
  "time",
  "select",
  "multiSelectExact",
  "fileUpload",
  "placeAutocomplete",
]);

const FIXTURE_DIR = path.resolve(__dirname, "../../__fixtures__/sanity/e2e");

type FixtureWithSections = {
  sections?: SanityFormSection[];
};

function loadFixture(filename: string): FixtureWithSections {
  const raw = readFileSync(path.join(FIXTURE_DIR, filename), "utf8");
  const parsed = JSON.parse(raw);
  return (parsed ?? {}) as FixtureWithSections;
}

const FORM_FIXTURES = readdirSync(FIXTURE_DIR)
  .filter((name) => name.endsWith(".json"))
  .filter((name) => {
    const data = loadFixture(name);
    return Array.isArray(data.sections) && data.sections.length > 0;
  });

describe("render-validator parity contract", () => {
  it("discovers at least one form fixture", () => {
    expect(FORM_FIXTURES.length).toBeGreaterThan(0);
  });

  describe.each(FORM_FIXTURES)("%s", (fixtureName) => {
    const data = loadFixture(fixtureName);
    const allFields = (data.sections ?? []).flatMap((section) => section.fields);
    const pairedUnknown = derivePairedUnknownKeys(allFields);

    const required = allFields.filter((field) => field.required);

    if (required.length === 0) {
      it("has no required fields to validate", () => {
        expect(required.length).toBe(0);
      });
      return;
    }

    it.each(required.map((field) => [field.key, field.type, field]))(
      "required key %s (type %s) is either renderable or a paired-unknown companion",
      (_key, _type, field) => {
        const f = field as SanityFormField;
        const isRenderable = RENDERABLE_FIELD_TYPES.has(f.type);
        const isPairedUnknown = pairedUnknown.has(f.key);
        expect(isRenderable || isPairedUnknown).toBe(true);
      },
    );
  });
});
