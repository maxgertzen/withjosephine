import { describe, expect, it } from "vitest";

import {
  buildContentDisposition,
  buildListenFilename,
  extractAssetExtension,
} from "./downloadFilename";

describe("extractAssetExtension", () => {
  it("uses the trailing extension when allowed for the asset kind", () => {
    expect(
      extractAssetExtension("https://cdn.sanity.io/files/voice.m4a", "voice-note"),
    ).toBe("m4a");
    expect(
      extractAssetExtension("https://cdn.sanity.io/files/voice.mp3", "voice-note"),
    ).toBe("mp3");
    expect(
      extractAssetExtension("https://cdn.sanity.io/files/reading.pdf", "reading"),
    ).toBe("pdf");
  });

  it("falls back when extension is missing or unrecognized", () => {
    expect(extractAssetExtension("https://cdn.sanity.io/files/voice", "voice-note")).toBe("mp3");
    expect(
      extractAssetExtension("https://cdn.sanity.io/files/voice.exe", "voice-note"),
    ).toBe("mp3");
    expect(
      extractAssetExtension("https://cdn.sanity.io/files/reading.pdf.exe", "reading"),
    ).toBe("pdf");
  });

  it("falls back on malformed URLs without throwing", () => {
    expect(extractAssetExtension("not-a-url", "voice-note")).toBe("mp3");
    expect(extractAssetExtension("", "reading")).toBe("pdf");
  });

  it("ignores query strings on the source URL", () => {
    expect(
      extractAssetExtension(
        "https://cdn.sanity.io/files/voice.mp3?dl=foo&token=abc",
        "voice-note",
      ),
    ).toBe("mp3");
  });
});

describe("buildListenFilename", () => {
  const VOICE_URL = "https://cdn.sanity.io/files/voice.m4a";
  const PDF_URL = "https://cdn.sanity.io/files/reading.pdf";

  it("produces 'First Last ReadingName.ext' when all fields are present", () => {
    expect(
      buildListenFilename({
        firstName: "Ada",
        lastName: "Lovelace",
        readingName: "Soul Blueprint",
        readingSlug: "soul-blueprint",
        submissionId: "sub_1",
        sourceUrl: VOICE_URL,
        kind: "voice-note",
      }),
    ).toBe("Ada Lovelace Soul Blueprint.m4a");

    expect(
      buildListenFilename({
        firstName: "Test",
        lastName: "User",
        readingName: "Birth Chart Reading",
        readingSlug: "birth-chart",
        submissionId: "sub_2",
        sourceUrl: PDF_URL,
        kind: "reading",
      }),
    ).toBe("Test User Birth Chart Reading.pdf");
  });

  it("omits missing last name gracefully", () => {
    expect(
      buildListenFilename({
        firstName: "Ada",
        lastName: null,
        readingName: "Soul Blueprint",
        readingSlug: "soul-blueprint",
        submissionId: "sub_1",
        sourceUrl: PDF_URL,
        kind: "reading",
      }),
    ).toBe("Ada Soul Blueprint.pdf");
  });

  it("omits missing first name gracefully", () => {
    expect(
      buildListenFilename({
        firstName: null,
        lastName: "Lovelace",
        readingName: "Soul Blueprint",
        readingSlug: "soul-blueprint",
        submissionId: "sub_1",
        sourceUrl: PDF_URL,
        kind: "reading",
      }),
    ).toBe("Lovelace Soul Blueprint.pdf");
  });

  it("omits missing reading name, uses remaining name parts", () => {
    expect(
      buildListenFilename({
        firstName: "Ada",
        lastName: "Lovelace",
        readingName: null,
        readingSlug: "soul-blueprint",
        submissionId: "sub_1",
        sourceUrl: PDF_URL,
        kind: "reading",
      }),
    ).toBe("Ada Lovelace.pdf");
  });

  it("falls back to reading slug when all name fields are absent", () => {
    expect(
      buildListenFilename({
        firstName: null,
        lastName: null,
        readingName: null,
        readingSlug: "soul-blueprint",
        submissionId: "sub_1",
        sourceUrl: PDF_URL,
        kind: "reading",
      }),
    ).toBe("soul-blueprint.pdf");
  });

  it("falls back to 'reading' when all name fields and slug are absent", () => {
    expect(
      buildListenFilename({
        firstName: null,
        lastName: null,
        readingName: null,
        readingSlug: "",
        submissionId: "sub_1",
        sourceUrl: PDF_URL,
        kind: "reading",
      }),
    ).toBe("reading.pdf");
  });

  it("falls back to reading slug when firstName/lastName/readingName are empty strings", () => {
    expect(
      buildListenFilename({
        firstName: "",
        lastName: "",
        readingName: "",
        readingSlug: "akashic-record",
        submissionId: "sub_1",
        sourceUrl: VOICE_URL,
        kind: "voice-note",
      }),
    ).toBe("akashic-record.m4a");
  });

  it("strips quote/backslash and replaces control chars with spaces in name parts", () => {
    expect(
      buildListenFilename({
        firstName: 'Ada"',
        lastName: "Love\rlace",
        readingName: "Soul\nBlueprint",
        readingSlug: "soul-blueprint",
        submissionId: "sub_1",
        sourceUrl: PDF_URL,
        kind: "reading",
      }),
    ).toBe("Ada Love lace Soul Blueprint.pdf");
  });

  it("preserves non-ASCII (Unicode) characters in name parts", () => {
    expect(
      buildListenFilename({
        firstName: "Zoé",
        lastName: "Müller",
        readingName: "Soul Blueprint",
        readingSlug: "soul-blueprint",
        submissionId: "sub_1",
        sourceUrl: PDF_URL,
        kind: "reading",
      }),
    ).toBe("Zoé Müller Soul Blueprint.pdf");
  });

  it("collapses internal whitespace in name parts", () => {
    expect(
      buildListenFilename({
        firstName: "Ada   ",
        lastName: "  Lovelace",
        readingName: "Soul  Blueprint",
        readingSlug: "soul-blueprint",
        submissionId: "sub_1",
        sourceUrl: PDF_URL,
        kind: "reading",
      }),
    ).toBe("Ada Lovelace Soul Blueprint.pdf");
  });
});

describe("buildContentDisposition", () => {
  it("emits inline with ASCII fallback and RFC 6266 filename*", () => {
    expect(
      buildContentDisposition({
        type: "inline",
        filename: "Ada Lovelace Soul Blueprint.m4a",
      }),
    ).toBe(
      "inline; filename=\"Ada Lovelace Soul Blueprint.m4a\"; filename*=UTF-8''Ada%20Lovelace%20Soul%20Blueprint.m4a",
    );
  });

  it("emits attachment with ASCII fallback and RFC 6266 filename*", () => {
    expect(
      buildContentDisposition({
        type: "attachment",
        filename: "Test User Birth Chart Reading.pdf",
      }),
    ).toBe(
      "attachment; filename=\"Test User Birth Chart Reading.pdf\"; filename*=UTF-8''Test%20User%20Birth%20Chart%20Reading.pdf",
    );
  });

  it("replaces non-ASCII in the ASCII fallback but preserves them percent-encoded in filename*", () => {
    const result = buildContentDisposition({
      type: "attachment",
      filename: "Zoé Müller Soul Blueprint.pdf",
    });
    expect(result).toContain('filename="Zo_ M_ller Soul Blueprint.pdf"');
    expect(result).toContain("filename*=UTF-8''Zo%C3%A9%20M%C3%BCller%20Soul%20Blueprint.pdf");
  });

  it("throws on header-injection candidates: double quote", () => {
    expect(() =>
      buildContentDisposition({ type: "attachment", filename: 'evil".pdf' }),
    ).toThrow(/unsafe characters/);
  });

  it("throws on header-injection candidates: carriage return", () => {
    expect(() =>
      buildContentDisposition({ type: "attachment", filename: "evil\r.pdf" }),
    ).toThrow(/unsafe characters/);
  });

  it("throws on header-injection candidates: newline", () => {
    expect(() =>
      buildContentDisposition({ type: "attachment", filename: "evil\n.pdf" }),
    ).toThrow(/unsafe characters/);
  });

  it("throws on header-injection candidates: backslash", () => {
    expect(() =>
      buildContentDisposition({ type: "attachment", filename: "evil\\.pdf" }),
    ).toThrow(/unsafe characters/);
  });

  it("ASCII-only filenames produce identical ASCII fallback and encoded param", () => {
    const result = buildContentDisposition({
      type: "inline",
      filename: "soul-blueprint.pdf",
    });
    expect(result).toBe(
      "inline; filename=\"soul-blueprint.pdf\"; filename*=UTF-8''soul-blueprint.pdf",
    );
  });
});
