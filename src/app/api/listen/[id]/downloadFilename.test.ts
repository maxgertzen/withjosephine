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
  it("composes slug + kind + submission id + extension", () => {
    expect(
      buildListenFilename({
        readingSlug: "soul-blueprint",
        submissionId: "sub_1",
        sourceUrl: "https://cdn.sanity.io/files/voice.m4a",
        kind: "voice-note",
      }),
    ).toBe("soul-blueprint-voice-note-sub_1.m4a");

    expect(
      buildListenFilename({
        readingSlug: "akashic-record",
        submissionId: "sub_42",
        sourceUrl: "https://cdn.sanity.io/files/reading.pdf",
        kind: "reading",
      }),
    ).toBe("akashic-record-reading-sub_42.pdf");
  });

  it("sanitizes unsafe slug input to a fallback rather than embedding raw characters", () => {
    expect(
      buildListenFilename({
        readingSlug: 'evil"; DROP TABLE',
        submissionId: "sub_1",
        sourceUrl: "https://cdn.sanity.io/files/reading.pdf",
        kind: "reading",
      }),
    ).toBe("reading-reading-sub_1.pdf");
  });

  it("sanitizes unsafe submission id input", () => {
    expect(
      buildListenFilename({
        readingSlug: "soul-blueprint",
        submissionId: 'bad"; rm -rf /',
        sourceUrl: "https://cdn.sanity.io/files/reading.pdf",
        kind: "reading",
      }),
    ).toBe("soul-blueprint-reading-reading.pdf");
  });
});

describe("buildContentDisposition", () => {
  it("emits attachment with quoted filename", () => {
    expect(
      buildContentDisposition({ type: "attachment", filename: "soul-blueprint-reading-sub_1.pdf" }),
    ).toBe('attachment; filename="soul-blueprint-reading-sub_1.pdf"');
  });

  it("emits inline with quoted filename", () => {
    expect(
      buildContentDisposition({
        type: "inline",
        filename: "soul-blueprint-voice-note-sub_1.m4a",
      }),
    ).toBe('inline; filename="soul-blueprint-voice-note-sub_1.m4a"');
  });
});
