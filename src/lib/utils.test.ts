import { describe, expect, it } from "vitest";

import { escapeHtml, isPlainLeftClick, isSameOrigin, mergeClasses } from "./utils";

describe("isSameOrigin", () => {
  it.each([
    [`${window.location.origin}/privacy`, true],
    ["https://www.google.com/", false],
    ["", false],
    ["not a url", false],
  ])("%s -> %s", (url, expected) => {
    expect(isSameOrigin(url)).toBe(expected);
  });
});

describe("isPlainLeftClick", () => {
  const plain = {
    defaultPrevented: false,
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
  };

  it("is true for an unmodified primary-button click", () => {
    expect(isPlainLeftClick(plain)).toBe(true);
  });

  it.each([
    ["defaultPrevented", { defaultPrevented: true }],
    ["middle button", { button: 1 }],
    ["meta", { metaKey: true }],
    ["ctrl", { ctrlKey: true }],
    ["shift", { shiftKey: true }],
    ["alt", { altKey: true }],
  ])("is false with %s", (_case, override) => {
    expect(isPlainLeftClick({ ...plain, ...override })).toBe(false);
  });
});

describe("escapeHtml", () => {
  it("escapes ampersands", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes angle brackets", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });

  it("escapes double and single quotes", () => {
    expect(escapeHtml(`"hello" 'world'`)).toBe("&quot;hello&quot; &#39;world&#39;");
  });
});

describe("mergeClasses", () => {
  it("composes clsx + twMerge so Tailwind conflicts resolve and falsy values drop", () => {
    expect(mergeClasses("a", false, null, undefined, "p-2", "p-4", "b")).toBe("a p-4 b");
  });
});
