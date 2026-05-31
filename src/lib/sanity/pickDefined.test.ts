import { describe, expect, it } from "vitest";

import { pickDefined } from "./pickDefined";

describe("pickDefined", () => {
  it("strips null values", () => {
    expect(pickDefined({ a: "x", b: null })).toEqual({ a: "x" });
  });

  it("strips undefined values", () => {
    expect(pickDefined({ a: "x", b: undefined })).toEqual({ a: "x" });
  });

  it("preserves empty string", () => {
    expect(pickDefined({ a: "", b: null })).toEqual({ a: "" });
  });

  it("preserves zero", () => {
    expect(pickDefined({ count: 0, missing: null })).toEqual({ count: 0 });
  });

  it("preserves false", () => {
    expect(pickDefined({ enabled: false, disabled: null })).toEqual({ enabled: false });
  });

  it("is a shallow copy: nested object reference is preserved", () => {
    const nested = { inner: { keep: null } };
    expect(pickDefined(nested).inner).toBe(nested.inner);
  });

  it("arrays pass through verbatim, even with null elements", () => {
    expect(pickDefined({ list: [null, "x"] })).toEqual({ list: [null, "x"] });
  });

  it("returns empty object for empty input", () => {
    expect(pickDefined({})).toEqual({});
  });

  it("strips only null + undefined, preserves arrays", () => {
    expect(pickDefined({ list: [], items: null })).toEqual({ list: [] });
  });

  it("the merge pattern restores DEFAULTS when sanity field is null", () => {
    const DEFAULTS = { title: "Default Title", subtitle: "Default Sub" };
    const sanity = { title: null, subtitle: "Becky's edit" };
    const result = { ...DEFAULTS, ...pickDefined(sanity) };
    expect(result).toEqual({ title: "Default Title", subtitle: "Becky's edit" });
  });
});
