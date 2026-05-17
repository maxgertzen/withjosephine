import { describe, expect, it } from "vitest";

import { isValidPhotoR2Key } from "./photoKeyValidation";

describe("isValidPhotoR2Key", () => {
  it("accepts a typical issuer-shaped key", () => {
    expect(isValidPhotoR2Key("submissions/abc-123/photo-1700000000-headshot.jpg")).toBe(true);
  });

  it("accepts keys with hyphenated submission ids", () => {
    expect(
      isValidPhotoR2Key("submissions/sub-zb8tnf5k7rqv4q9h2nx5/photo-1701234567-portrait.webp"),
    ).toBe(true);
  });

  it("rejects parent-directory traversal attempts", () => {
    expect(isValidPhotoR2Key("../escape")).toBe(false);
    expect(isValidPhotoR2Key("submissions/../../etc/passwd")).toBe(false);
    expect(isValidPhotoR2Key("../../backups/weekly/2026-W19/dataset.ndjson")).toBe(false);
  });

  it("rejects absolute paths", () => {
    expect(isValidPhotoR2Key("/submissions/x/photo-1")).toBe(false);
  });

  it("rejects keys that omit the submissions/ prefix", () => {
    expect(isValidPhotoR2Key("uploads/x/photo-1")).toBe(false);
    expect(isValidPhotoR2Key("photo-1.jpg")).toBe(false);
  });

  it("rejects keys with a missing photo- segment", () => {
    expect(isValidPhotoR2Key("submissions/abc/file-1.jpg")).toBe(false);
    expect(isValidPhotoR2Key("submissions/abc/")).toBe(false);
  });

  it("rejects keys with empty submission ids", () => {
    expect(isValidPhotoR2Key("submissions//photo-1.jpg")).toBe(false);
  });

  it("rejects URLs in the photoR2Key slot (schema-drift defence)", () => {
    expect(isValidPhotoR2Key("https://example.com/photo.jpg")).toBe(false);
    expect(isValidPhotoR2Key("data:image/png;base64,AAA")).toBe(false);
  });

  it("rejects the empty string", () => {
    expect(isValidPhotoR2Key("")).toBe(false);
  });
});
