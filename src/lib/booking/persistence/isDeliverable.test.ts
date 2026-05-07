import { describe, expect, it } from "vitest";

import { isDeliverable } from "./isDeliverable";

describe("isDeliverable", () => {
  it("returns true when deliveredAt + both URLs are present", () => {
    expect(
      isDeliverable({
        _id: "sub-1",
        deliveredAt: "2026-05-07T12:00:00Z",
        voiceNoteUrl: "https://cdn.sanity.io/files/.../voice.m4a",
        pdfUrl: "https://cdn.sanity.io/files/.../reading.pdf",
      }),
    ).toBe(true);
  });

  it("returns false when deliveredAt is missing", () => {
    expect(
      isDeliverable({
        _id: "sub-1",
        voiceNoteUrl: "https://cdn.sanity.io/files/.../voice.m4a",
        pdfUrl: "https://cdn.sanity.io/files/.../reading.pdf",
      }),
    ).toBe(false);
  });

  it("returns false when voice note URL is missing", () => {
    expect(
      isDeliverable({
        _id: "sub-1",
        deliveredAt: "2026-05-07T12:00:00Z",
        pdfUrl: "https://cdn.sanity.io/files/.../reading.pdf",
      }),
    ).toBe(false);
  });

  it("returns false when PDF URL is missing", () => {
    expect(
      isDeliverable({
        _id: "sub-1",
        deliveredAt: "2026-05-07T12:00:00Z",
        voiceNoteUrl: "https://cdn.sanity.io/files/.../voice.m4a",
      }),
    ).toBe(false);
  });

  it("returns false on an empty doc", () => {
    expect(isDeliverable({ _id: "sub-1" })).toBe(false);
  });

  it("treats empty strings as missing", () => {
    expect(
      isDeliverable({
        _id: "sub-1",
        deliveredAt: "2026-05-07T12:00:00Z",
        voiceNoteUrl: "",
        pdfUrl: "https://cdn.sanity.io/files/.../reading.pdf",
      }),
    ).toBe(false);
  });
});
