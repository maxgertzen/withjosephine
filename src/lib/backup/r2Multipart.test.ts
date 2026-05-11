import { describe, expect, it, vi } from "vitest";

import {
  R2_MULTIPART_MIN_PART_SIZE,
  streamToR2Multipart,
} from "./r2Multipart";
import type { R2Bucket } from "./types";

interface MockMultipartUpload {
  uploadPart: ReturnType<typeof vi.fn>;
  complete: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
  parts: { partNumber: number; size: number }[];
}

interface MockBucket {
  createMultipartUpload: ReturnType<typeof vi.fn>;
  upload: MockMultipartUpload;
}

function makeMockBucket(): MockBucket {
  const parts: { partNumber: number; size: number }[] = [];
  const upload: MockMultipartUpload = {
    parts,
    uploadPart: vi.fn(async (partNumber: number, body: Uint8Array) => {
      parts.push({ partNumber, size: body.byteLength });
      return { partNumber, etag: `etag-${partNumber}` };
    }),
    complete: vi.fn(async (parts: { partNumber: number; etag: string }[]) => ({
      etag: parts.map((p) => p.etag).join("|"),
    })),
    abort: vi.fn(async () => {}),
  };
  return {
    createMultipartUpload: vi.fn(async () => upload),
    upload,
  };
}

function streamOf(...chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

function bytes(size: number, fill = 0x61): Uint8Array {
  return new Uint8Array(size).fill(fill);
}

// Use a small partSize in tests so we don't allocate 5 MiB per case.
const TEST_PART_SIZE = 1024;

describe("streamToR2Multipart", () => {
  it("uploads a single small payload as one part", async () => {
    const mock = makeMockBucket();
    const result = await streamToR2Multipart({
      bucket: mock as unknown as R2Bucket,
      key: "test/small.bin",
      source: streamOf(bytes(500)),
      partSize: TEST_PART_SIZE,
    });

    expect(result.bytesUploaded).toBe(500);
    expect(result.partCount).toBe(1);
    expect(mock.upload.parts).toEqual([{ partNumber: 1, size: 500 }]);
    expect(mock.upload.complete).toHaveBeenCalledOnce();
    expect(mock.upload.abort).not.toHaveBeenCalled();
  });

  it("uploads exact-part-size payload as a single part (no final flush)", async () => {
    const mock = makeMockBucket();
    const result = await streamToR2Multipart({
      bucket: mock as unknown as R2Bucket,
      key: "test/exact.bin",
      source: streamOf(bytes(TEST_PART_SIZE)),
      partSize: TEST_PART_SIZE,
    });

    expect(result.partCount).toBe(1);
    expect(result.bytesUploaded).toBe(TEST_PART_SIZE);
    expect(mock.upload.parts).toEqual([{ partNumber: 1, size: TEST_PART_SIZE }]);
  });

  it("splits a multi-part payload across uploadPart calls", async () => {
    const mock = makeMockBucket();
    // 12 chunks of 1KB → 12KB total → with partSize=1024, that's 12 parts.
    // Use partSize=2048 for a 6-part 12KB upload (better coverage).
    const total = 12_000;
    const source = streamOf(bytes(4000), bytes(4000), bytes(4000));
    const result = await streamToR2Multipart({
      bucket: mock as unknown as R2Bucket,
      key: "test/multi.bin",
      source,
      partSize: 2048,
    });

    expect(result.bytesUploaded).toBe(total);
    // 12000 / 2048 = 5.86 → 5 full parts of 2048 + 1 final part of 1760
    expect(result.partCount).toBe(6);
    expect(mock.upload.parts.map((p) => p.size)).toEqual([2048, 2048, 2048, 2048, 2048, 1760]);
  });

  it("splits payload arriving as one large chunk into part-sized uploads", async () => {
    const mock = makeMockBucket();
    const source = streamOf(bytes(TEST_PART_SIZE * 3 + 100));
    const result = await streamToR2Multipart({
      bucket: mock as unknown as R2Bucket,
      key: "test/big-chunk.bin",
      source,
      partSize: TEST_PART_SIZE,
    });

    expect(result.partCount).toBe(4);
    expect(mock.upload.parts.map((p) => p.size)).toEqual([
      TEST_PART_SIZE,
      TEST_PART_SIZE,
      TEST_PART_SIZE,
      100,
    ]);
  });

  it("uploads a zero-byte part for an empty stream so complete() has something to ack", async () => {
    const mock = makeMockBucket();
    const result = await streamToR2Multipart({
      bucket: mock as unknown as R2Bucket,
      key: "test/empty.bin",
      source: streamOf(),
      partSize: TEST_PART_SIZE,
    });

    expect(result.partCount).toBe(1);
    expect(result.bytesUploaded).toBe(0);
    expect(mock.upload.parts).toEqual([{ partNumber: 1, size: 0 }]);
  });

  it("aborts the multipart upload when uploadPart throws and re-throws the original error", async () => {
    const mock = makeMockBucket();
    const failure = new Error("uploadPart failed: 502 bad gateway");
    mock.upload.uploadPart.mockRejectedValueOnce(failure);

    await expect(
      streamToR2Multipart({
        bucket: mock as unknown as R2Bucket,
        key: "test/fails.bin",
        source: streamOf(bytes(TEST_PART_SIZE * 2)),
        partSize: TEST_PART_SIZE,
      }),
    ).rejects.toBe(failure);

    expect(mock.upload.abort).toHaveBeenCalledOnce();
    expect(mock.upload.complete).not.toHaveBeenCalled();
  });

  it("does NOT propagate an abort() failure as the surfaced error", async () => {
    const mock = makeMockBucket();
    const uploadFailure = new Error("uploadPart 502");
    mock.upload.uploadPart.mockRejectedValueOnce(uploadFailure);
    mock.upload.abort.mockRejectedValueOnce(new Error("abort also failed"));

    await expect(
      streamToR2Multipart({
        bucket: mock as unknown as R2Bucket,
        key: "test/abort-fails.bin",
        source: streamOf(bytes(TEST_PART_SIZE)),
        partSize: TEST_PART_SIZE,
      }),
    ).rejects.toBe(uploadFailure);
  });

  it("uses the 5 MiB default part size when not specified", () => {
    expect(R2_MULTIPART_MIN_PART_SIZE).toBe(5 * 1024 * 1024);
  });
});
