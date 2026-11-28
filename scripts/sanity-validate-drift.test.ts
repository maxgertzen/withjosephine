import { describe, expect, it } from "vitest";

import type { SingletonContract } from "./sanity-validate-contract.mts";
import { findSchemaDrift } from "./sanity-validate-drift.mts";

const FIXTURE: SingletonContract = {
  id: "exampleSingleton",
  type: "exampleSingleton",
  fields: [
    { name: "title", type: "string" },
    { name: "subtitle", type: "string" },
  ],
};

describe("findSchemaDrift", () => {
  it("returns empty when every doc field is in the contract", () => {
    const doc = { _id: "exampleSingleton", _type: "exampleSingleton", title: "x", subtitle: "y" };
    expect(findSchemaDrift(FIXTURE, doc)).toEqual([]);
  });

  it("flags a field that exists in the doc but not in the contract", () => {
    const doc = {
      _id: "exampleSingleton",
      _type: "exampleSingleton",
      title: "x",
      subtitle: "y",
      newSchemaField: "added in Studio after contract write",
    };
    const result = findSchemaDrift(FIXTURE, doc);
    expect(result).toEqual([
      {
        singleton: "exampleSingleton",
        unknownField: "newSchemaField",
        valueType: "string",
      },
    ]);
  });

  it("flags multiple unknown fields independently", () => {
    const doc = {
      title: "x",
      subtitle: "y",
      extraOne: 42,
      extraTwo: [1, 2, 3],
      extraThree: null,
    };
    const result = findSchemaDrift(FIXTURE, doc);
    expect(result).toHaveLength(3);
    expect(result.map((d) => d.unknownField).sort()).toEqual([
      "extraOne",
      "extraThree",
      "extraTwo",
    ]);
    expect(result.find((d) => d.unknownField === "extraOne")?.valueType).toBe("number");
    expect(result.find((d) => d.unknownField === "extraTwo")?.valueType).toBe("array(len=3)");
    expect(result.find((d) => d.unknownField === "extraThree")?.valueType).toBe("null");
  });

  it("ignores Sanity meta-fields", () => {
    const doc = {
      _id: "exampleSingleton",
      _type: "exampleSingleton",
      _rev: "abc",
      _createdAt: "2026-01-01",
      _updatedAt: "2026-01-02",
      _key: "k",
      _system: { base: { id: "exampleSingleton" } },
      title: "x",
      subtitle: "y",
    };
    expect(findSchemaDrift(FIXTURE, doc)).toEqual([]);
  });

  it("handles an empty doc gracefully", () => {
    expect(findSchemaDrift(FIXTURE, {})).toEqual([]);
  });

  it("handles a contract with zero fields (all keys become drift)", () => {
    const empty: SingletonContract = { id: "x", type: "x", fields: [] };
    const result = findSchemaDrift(empty, { title: "y", extra: 1 });
    expect(result.map((d) => d.unknownField).sort()).toEqual(["extra", "title"]);
  });
});
