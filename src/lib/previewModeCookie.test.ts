import { describe, expect, it } from "vitest";

import { leavePreviewHref, previewActiveFromCookie, safeRedirectPath } from "./previewModeCookie";

describe("previewModeCookie", () => {
  it("reads the preview-active flag among other cookies", () => {
    expect(previewActiveFromCookie("consent-required=0; preview-active=1")).toBe(true);
    expect(previewActiveFromCookie("consent-required=0")).toBe(false);
    expect(previewActiveFromCookie("preview-active=0")).toBe(false);
  });

  it("links to the disable route with the current path", () => {
    expect(leavePreviewHref("/book/birth-chart")).toBe(
      "/api/draft/disable?redirect=%2Fbook%2Fbirth-chart",
    );
  });

  it.each([
    ["/book/birth-chart", "/book/birth-chart"],
    [null, "/"],
    ["https://evil.example", "/"],
    ["//evil.example", "/"],
    ["/\\evil.example", "/"],
    ["/\t/evil.example", "/"],
    ["/\n/evil.example", "/"],
    ["/listen/abc?t=token#top", "/listen/abc?t=token#top"],
  ])("safeRedirectPath(%s) is %s", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });
});
