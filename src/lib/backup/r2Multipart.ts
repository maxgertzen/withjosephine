// R2 requires each part to be ≥5 MiB except the final part; chunks are
// buffered until that threshold before `uploadPart` is issued. On any
// failure mid-stream the multipart upload is `abort()`-ed — R2 has no
// Workers-side auto-cleanup of in-flight uploads, so orphan parts would
// otherwise bill storage indefinitely.

import type { R2Bucket, R2HTTPMetadata, R2UploadedPart } from "./types";

export const R2_MULTIPART_MIN_PART_SIZE = 5 * 1024 * 1024;

export interface StreamToR2MultipartArgs {
  bucket: R2Bucket;
  key: string;
  source: ReadableStream<Uint8Array>;
  partSize?: number;
  httpMetadata?: R2HTTPMetadata;
}

export interface StreamToR2MultipartResult {
  bytesUploaded: number;
  partCount: number;
  etag?: string;
}

export async function streamToR2Multipart(
  args: StreamToR2MultipartArgs,
): Promise<StreamToR2MultipartResult> {
  const partSize = args.partSize ?? R2_MULTIPART_MIN_PART_SIZE;
  const upload = await args.bucket.createMultipartUpload(args.key, {
    httpMetadata: args.httpMetadata,
  });
  const reader = args.source.getReader();
  const parts: R2UploadedPart[] = [];
  const pending: Uint8Array[] = [];
  let pendingBytes = 0;
  let partNumber = 1;
  let bytesUploaded = 0;

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (value && value.byteLength > 0) {
        pending.push(value);
        pendingBytes += value.byteLength;
      }
      while (pendingBytes >= partSize) {
        const chunk = takeBytes(pending, partSize);
        const part = await upload.uploadPart(partNumber, chunk);
        parts.push(part);
        bytesUploaded += chunk.byteLength;
        pendingBytes -= chunk.byteLength;
        partNumber += 1;
      }
      if (done) break;
    }

    // Final flush: upload whatever's left. If no parts were uploaded at all
    // (empty stream), we still emit one zero-byte part so `complete()` has
    // something to acknowledge. R2 allows the final part to be < min size.
    if (pendingBytes > 0 || parts.length === 0) {
      const tail = takeAll(pending, pendingBytes);
      const part = await upload.uploadPart(partNumber, tail);
      parts.push(part);
      bytesUploaded += tail.byteLength;
    }

    const object = await upload.complete(parts);
    return { bytesUploaded, partCount: parts.length, etag: object.etag };
  } catch (error) {
    try {
      await upload.abort();
    } catch {
      // Surface the original error; the abort failure is secondary.
    }
    throw error;
  } finally {
    reader.releaseLock();
  }
}

function takeBytes(queue: Uint8Array[], n: number): Uint8Array {
  const out = new Uint8Array(n);
  let written = 0;
  while (written < n) {
    const head = queue[0];
    if (!head) throw new Error("takeBytes: queue exhausted before target");
    const remaining = n - written;
    if (head.byteLength <= remaining) {
      out.set(head, written);
      written += head.byteLength;
      queue.shift();
    } else {
      out.set(head.subarray(0, remaining), written);
      queue[0] = head.subarray(remaining);
      written += remaining;
    }
  }
  return out;
}

function takeAll(queue: Uint8Array[], totalBytes: number): Uint8Array {
  const out = new Uint8Array(totalBytes);
  let written = 0;
  for (const chunk of queue) {
    out.set(chunk, written);
    written += chunk.byteLength;
  }
  queue.length = 0;
  return out;
}
