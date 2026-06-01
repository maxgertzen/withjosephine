import { describe, expect, it } from "vitest";

import { diffSingleton } from "./audit-defaults-drift.mts";

describe("audit-defaults-drift diffSingleton (laj8x38r)", () => {
  it("returns no drifts when prod matches default scalars exactly", () => {
    const { drifts, scanned } = diffSingleton(
      { docType: "fakeSingleton", defaults: { heading: "Hello", count: 3 } },
      { _id: "fake", heading: "Hello", count: 3 },
    );
    expect(scanned).toBe(2);
    expect(drifts).toEqual([]);
  });

  it("flags 'drift' when prod scalar value diverges from default", () => {
    const { drifts } = diffSingleton(
      { docType: "fakeSingleton", defaults: { heading: "Hello" } },
      { _id: "fake", heading: "Hola" },
    );
    expect(drifts).toEqual([
      {
        docType: "fakeSingleton",
        field: "heading",
        kind: "drift",
        defaultValue: "Hello",
        prodValue: "Hola",
      },
    ]);
  });

  it("flags 'missing-in-prod' when prod field is null or undefined", () => {
    const { drifts } = diffSingleton(
      { docType: "fakeSingleton", defaults: { heading: "Hello", tagline: "Hi" } },
      { _id: "fake", heading: null, tagline: undefined },
    );
    expect(drifts).toHaveLength(2);
    expect(drifts.every((d) => d.kind === "missing-in-prod")).toBe(true);
  });

  it("flags 'extra-in-prod' for scalar fields not declared in defaults", () => {
    const { drifts } = diffSingleton(
      { docType: "fakeSingleton", defaults: { heading: "Hello" } },
      { _id: "fake", heading: "Hello", bonusField: "Becky added me" },
    );
    expect(drifts).toEqual([
      {
        docType: "fakeSingleton",
        field: "bonusField",
        kind: "extra-in-prod",
        defaultValue: undefined,
        prodValue: "Becky added me",
      },
    ]);
  });

  it("flags shape-mismatch when prod stores a scalar at a key whose default is non-scalar", () => {
    const { drifts } = diffSingleton(
      {
        docType: "fakeSingleton",
        defaults: {
          heading: "Hello",
          nested: { foo: "bar" },
        },
      },
      { _id: "fake", heading: "Hello", nested: "Becky flattened me" },
    );
    expect(drifts).toEqual([
      {
        docType: "fakeSingleton",
        field: "nested",
        kind: "shape-mismatch",
        defaultValue: { foo: "bar" },
        prodValue: "Becky flattened me",
      },
    ]);
  });

  it("flags shape-mismatch when prod stores a non-scalar at a key whose default is scalar", () => {
    const { drifts } = diffSingleton(
      { docType: "fakeSingleton", defaults: { heading: "Hello" } },
      { _id: "fake", heading: { localized: "Hola" } },
    );
    expect(drifts).toEqual([
      {
        docType: "fakeSingleton",
        field: "heading",
        kind: "shape-mismatch",
        defaultValue: "Hello",
        prodValue: { localized: "Hola" },
      },
    ]);
  });

  it("skips non-scalar both sides (deep diff is a separate walker)", () => {
    const { scanned, drifts } = diffSingleton(
      {
        docType: "fakeSingleton",
        defaults: { nested: { foo: "bar" }, list: ["a", "b"] },
      },
      { _id: "fake", nested: { foo: "wrong" }, list: ["c"] },
    );
    expect(scanned).toBe(0);
    expect(drifts).toEqual([]);
  });

  it("returns empty result when the document is null (singleton missing from dataset)", () => {
    const { scanned, drifts } = diffSingleton(
      { docType: "fakeSingleton", defaults: { heading: "Hello" } },
      null,
    );
    expect(scanned).toBe(0);
    expect(drifts).toEqual([]);
  });

  it("ignores Sanity system fields (_id, _type, _rev, etc.) when scanning for extras", () => {
    const { drifts } = diffSingleton(
      { docType: "fakeSingleton", defaults: { heading: "Hello" } },
      {
        _id: "fake",
        _type: "fakeSingleton",
        _rev: "rev1",
        _createdAt: "2026-06-01T00:00:00Z",
        _updatedAt: "2026-06-01T00:00:00Z",
        heading: "Hello",
      },
    );
    expect(drifts).toEqual([]);
  });
});
