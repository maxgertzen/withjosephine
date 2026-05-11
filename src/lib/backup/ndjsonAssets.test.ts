import { describe, expect, it } from "vitest";

import { extractAssetRefs } from "./ndjsonAssets";

function streamOfText(text: string): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

function streamOfChunks(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

describe("extractAssetRefs", () => {
  it("extracts voiceNote.asset._ref from a submission line", async () => {
    const ndjson = `${JSON.stringify({
      _id: "sub_1",
      _type: "submission",
      voiceNote: { _type: "file", asset: { _type: "reference", _ref: "file-abc-mp3" } },
    })}\n`;
    const result = await extractAssetRefs(streamOfText(ndjson));
    expect(result.refs).toEqual([{ kind: "sanityFile", id: "file-abc-mp3" }]);
    expect(result.recordCount).toBe(1);
  });

  it("extracts readingPdf.asset._ref from a submission line", async () => {
    const ndjson = `${JSON.stringify({
      _id: "sub_2",
      readingPdf: { asset: { _ref: "file-xyz-pdf" } },
    })}\n`;
    const result = await extractAssetRefs(streamOfText(ndjson));
    expect(result.refs).toEqual([{ kind: "sanityFile", id: "file-xyz-pdf" }]);
    expect(result.recordCount).toBe(1);
  });

  it("extracts photoR2Key from a submission line", async () => {
    const ndjson = `${JSON.stringify({
      _id: "sub_3",
      photoR2Key: "submissions/sub_3/photo-1234-portrait.jpg",
    })}\n`;
    const result = await extractAssetRefs(streamOfText(ndjson));
    expect(result.refs).toEqual([
      { kind: "r2Photo", key: "submissions/sub_3/photo-1234-portrait.jpg" },
    ]);
    expect(result.recordCount).toBe(1);
  });

  it("extracts all three ref kinds from a single submission line", async () => {
    const ndjson = `${JSON.stringify({
      _id: "sub_4",
      voiceNote: { asset: { _ref: "file-aaa-mp3" } },
      readingPdf: { asset: { _ref: "file-bbb-pdf" } },
      photoR2Key: "submissions/sub_4/photo-9999.jpg",
    })}\n`;
    const result = await extractAssetRefs(streamOfText(ndjson));
    expect(result.refs).toEqual([
      { kind: "sanityFile", id: "file-aaa-mp3" },
      { kind: "sanityFile", id: "file-bbb-pdf" },
      { kind: "r2Photo", key: "submissions/sub_4/photo-9999.jpg" },
    ]);
  });

  it("yields no refs for records with no asset refs but still counts the record", async () => {
    const ndjson = `${JSON.stringify({
      _id: "reading_1",
      _type: "reading",
      title: "Soul Blueprint",
    })}\n`;
    const result = await extractAssetRefs(streamOfText(ndjson));
    expect(result.refs).toEqual([]);
    expect(result.recordCount).toBe(1);
  });

  it("deduplicates the same sanityFile id across multiple records", async () => {
    const ndjson = [
      JSON.stringify({ _id: "sub_a", voiceNote: { asset: { _ref: "file-shared-mp3" } } }),
      JSON.stringify({ _id: "sub_b", voiceNote: { asset: { _ref: "file-shared-mp3" } } }),
    ].join("\n");
    const result = await extractAssetRefs(streamOfText(`${ndjson}\n`));
    expect(result.refs).toEqual([{ kind: "sanityFile", id: "file-shared-mp3" }]);
    expect(result.recordCount).toBe(2);
  });

  it("ignores malformed JSON lines without aborting the walk", async () => {
    const ndjson = [
      "{ not valid json",
      JSON.stringify({ _id: "sub_x", voiceNote: { asset: { _ref: "file-good-mp3" } } }),
    ].join("\n");
    const result = await extractAssetRefs(streamOfText(`${ndjson}\n`));
    expect(result.refs).toEqual([{ kind: "sanityFile", id: "file-good-mp3" }]);
    expect(result.recordCount).toBe(1);
  });

  it("skips blank lines", async () => {
    const ndjson = `\n\n${JSON.stringify({ _id: "x", photoR2Key: "k" })}\n\n`;
    const result = await extractAssetRefs(streamOfText(ndjson));
    expect(result.refs).toEqual([{ kind: "r2Photo", key: "k" }]);
    expect(result.recordCount).toBe(1);
  });

  it("handles chunk boundaries that split a JSON line mid-record", async () => {
    const fullLine = JSON.stringify({
      _id: "sub_split",
      voiceNote: { asset: { _ref: "file-split-mp3" } },
    });
    const half = Math.floor(fullLine.length / 2);
    const result = await extractAssetRefs(
      streamOfChunks(fullLine.slice(0, half), `${fullLine.slice(half)}\n`),
    );
    expect(result.refs).toEqual([{ kind: "sanityFile", id: "file-split-mp3" }]);
    expect(result.recordCount).toBe(1);
  });

  it("handles chunk boundaries that split a JSON line mid-multi-byte-char", async () => {
    // TextDecoder with stream: true should buffer partial UTF-8 bytes.
    const fullLine = JSON.stringify({
      _id: "sub_unicode",
      photoR2Key: "submissions/sub_unicode/photo-café-naïve.jpg",
    });
    const encoded = new TextEncoder().encode(`${fullLine}\n`);
    const splitAt = Math.floor(encoded.byteLength / 2);
    const result = await extractAssetRefs(
      new ReadableStream({
        start(controller) {
          controller.enqueue(encoded.subarray(0, splitAt));
          controller.enqueue(encoded.subarray(splitAt));
          controller.close();
        },
      }),
    );
    expect(result.refs).toEqual([
      { kind: "r2Photo", key: "submissions/sub_unicode/photo-café-naïve.jpg" },
    ]);
    expect(result.recordCount).toBe(1);
  });

  it("ignores empty photoR2Key strings but still counts the record", async () => {
    const ndjson = `${JSON.stringify({ _id: "sub_empty", photoR2Key: "" })}\n`;
    const result = await extractAssetRefs(streamOfText(ndjson));
    expect(result.refs).toEqual([]);
    expect(result.recordCount).toBe(1);
  });

  it("ignores empty _ref strings but still counts the record", async () => {
    const ndjson = `${JSON.stringify({
      _id: "sub_empty_ref",
      voiceNote: { asset: { _ref: "" } },
    })}\n`;
    const result = await extractAssetRefs(streamOfText(ndjson));
    expect(result.refs).toEqual([]);
    expect(result.recordCount).toBe(1);
  });
});
