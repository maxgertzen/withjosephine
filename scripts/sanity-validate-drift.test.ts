import { describe, expect, it } from "vitest";

import type { SingletonContract } from "./sanity-validate-contract.mts";
import {
  findSchemaDrift,
  LEGACY_FIELDS_BY_SINGLETON,
  SANITY_META_FIELDS,
} from "./sanity-validate-drift.mts";

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
      title: "x",
      subtitle: "y",
    };
    expect(findSchemaDrift(FIXTURE, doc)).toEqual([]);
  });

  it("SANITY_META_FIELDS allowlist covers the documented system-prefixed keys", () => {
    expect(SANITY_META_FIELDS.has("_id")).toBe(true);
    expect(SANITY_META_FIELDS.has("_type")).toBe(true);
    expect(SANITY_META_FIELDS.has("_rev")).toBe(true);
    expect(SANITY_META_FIELDS.has("_createdAt")).toBe(true);
    expect(SANITY_META_FIELDS.has("_updatedAt")).toBe(true);
    expect(SANITY_META_FIELDS.has("_key")).toBe(true);
    expect(SANITY_META_FIELDS.has("title")).toBe(false);
  });

  it("ignores schema-declared legacy fields per LEGACY_FIELDS_BY_SINGLETON", () => {
    const giftClaim: SingletonContract = {
      id: "emailGiftClaim",
      type: "emailGiftClaim",
      fields: [{ name: "subjectFirstSend", type: "string" }],
    };
    const doc = {
      _id: "emailGiftClaim",
      _type: "emailGiftClaim",
      subjectFirstSend: "x",
      bodyFirstSend: [{ _type: "block" }],
      greeting: "legacy text",
    };
    expect(findSchemaDrift(giftClaim, doc)).toEqual([]);
  });

  it("singletons not in LEGACY_FIELDS_BY_SINGLETON still surface every unknown field", () => {
    const singleton: SingletonContract = {
      id: "singletonWithoutLegacy",
      type: "singletonWithoutLegacy",
      fields: [{ name: "title", type: "string" }],
    };
    const doc = { title: "ok", strayField: "unexpected" };
    const result = findSchemaDrift(singleton, doc);
    expect(result).toEqual([
      { singleton: "singletonWithoutLegacy", unknownField: "strayField", valueType: "string" },
    ]);
  });

  it("LEGACY_FIELDS_BY_SINGLETON only carries schema-declared legacy entries", () => {
    expect(Object.keys(LEGACY_FIELDS_BY_SINGLETON)).toEqual(["emailGiftClaim"]);
    expect(LEGACY_FIELDS_BY_SINGLETON.emailGiftClaim?.has("greeting")).toBe(true);
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
