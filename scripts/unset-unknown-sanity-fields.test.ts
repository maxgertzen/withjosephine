import { describe, expect, it } from "vitest";

import { findUnknownFieldPaths, type SchemaEntry } from "./unset-unknown-sanity-fields.mts";

type TypeNode = Extract<SchemaEntry, { type: "type" }>["value"];

const attr = (value: TypeNode) => ({ type: "objectAttribute" as const, value });
const STRING: TypeNode = { type: "string" };
const KEYED: TypeNode = { type: "object", attributes: { _key: attr(STRING) } };

const SCHEMA: SchemaEntry[] = [
  {
    type: "document",
    name: "page",
    attributes: {
      _id: attr(STRING),
      _type: attr({ type: "string", value: "page" }),
      title: attr(STRING),
      content: attr({ type: "object", attributes: { heading: attr(STRING) } }),
      facts: attr({
        type: "array",
        of: { type: "object", attributes: { label: attr(STRING) }, rest: KEYED },
      }),
      blocks: attr({
        type: "array",
        of: {
          type: "union",
          of: [
            {
              type: "object",
              attributes: { _type: attr({ type: "string", value: "quote" }), text: attr(STRING) },
            },
            {
              type: "object",
              attributes: { _type: attr({ type: "string", value: "image" }), alt: attr(STRING) },
            },
          ],
        },
      }),
      related: attr({ type: "inline", name: "page.reference" }),
      relatedList: attr({
        type: "array",
        of: {
          type: "object",
          attributes: { _key: attr(STRING) },
          rest: { type: "inline", name: "page.reference" },
        },
      }),
      quotes: attr({
        type: "array",
        of: {
          type: "object",
          attributes: { _type: attr({ type: "string", value: "quote" }), text: attr(STRING) },
        },
      }),
      tags: attr({ type: "array", of: STRING }),
    },
  },
  {
    type: "type",
    name: "page.reference",
    value: { type: "object", attributes: { _ref: attr(STRING), _type: attr(STRING) } },
  },
];

const page = (fields: Record<string, unknown>) => ({
  _id: "page",
  _type: "page",
  _rev: "r1",
  ...fields,
});

describe("findUnknownFieldPaths", () => {
  it("returns no paths for a document that matches the schema", () => {
    const doc = page({
      title: "Hi",
      content: { heading: "H" },
      facts: [{ _key: "a", label: "L" }],
      blocks: [{ _key: "b", _type: "quote", text: "T" }],
      related: { _ref: "x", _type: "reference", _weak: true },
      tags: ["one"],
    });
    expect(findUnknownFieldPaths(SCHEMA, doc)).toEqual([]);
  });

  it("finds unknown fields at the top level and inside nested objects", () => {
    const doc = page({ formatNote: "old", content: { heading: "H", letterOpener: "old" } });
    expect(findUnknownFieldPaths(SCHEMA, doc)).toEqual(["formatNote", "content.letterOpener"]);
  });

  it("addresses array items by _key, and by index when an item has no _key", () => {
    const doc = page({
      facts: [
        { _key: "a", label: "L", icon: "x" },
        { label: "M", icon: "y" },
      ],
    });
    expect(findUnknownFieldPaths(SCHEMA, doc)).toEqual(['facts[_key=="a"].icon', "facts[1].icon"]);
  });

  it("picks the union member by _type", () => {
    const doc = page({
      blocks: [
        { _key: "q", _type: "quote", text: "T", alt: "wrong member" },
        { _key: "i", _type: "image", alt: "A" },
      ],
    });
    expect(findUnknownFieldPaths(SCHEMA, doc)).toEqual(['blocks[_key=="q"].alt']);
  });

  it("leaves union items alone when no member matches their _type", () => {
    expect(
      findUnknownFieldPaths(SCHEMA, page({ blocks: [{ _key: "v", _type: "video", url: "u" }] })),
    ).toEqual([]);
  });

  it("resolves an inline rest, so keyed references report only their unknown fields", () => {
    const doc = page({ relatedList: [{ _key: "r", _ref: "x", _type: "reference", label: "old" }] });
    expect(findUnknownFieldPaths(SCHEMA, doc)).toEqual(['relatedList[_key=="r"].label']);
  });

  it("leaves a single-type item alone when its _type is not the declared one", () => {
    const doc = page({ quotes: [{ _key: "o", _type: "oldQuote", text: "T", author: "A" }] });
    expect(findUnknownFieldPaths(SCHEMA, doc)).toEqual([]);
  });

  it("throws rather than build an unset path for a key that is not a plain field name", () => {
    expect(() => findUnknownFieldPaths(SCHEMA, page({ content: { "cta-text": "x" } }))).toThrow(
      /cta-text/,
    );
    expect(() =>
      findUnknownFieldPaths(SCHEMA, page({ facts: [{ _key: 'a"b', icon: "x" }] })),
    ).toThrow(/a"b/);
  });

  it("never reports underscore keys", () => {
    expect(findUnknownFieldPaths(SCHEMA, page({ _system: {}, _createdAt: "now" }))).toEqual([]);
  });

  it("returns null for a document type the schema does not declare", () => {
    expect(
      findUnknownFieldPaths(SCHEMA, { _id: "g", _type: "giftClaimPage", _rev: "r1" }),
    ).toBeNull();
  });
});
