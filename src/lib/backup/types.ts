/**
 * Minimal R2 binding shapes the backup cron consumes. Mirrors the relevant
 * surface of `@cloudflare/workers-types` without pulling the full package in.
 * Same approach as `src/lib/booking/persistence/d1BindingClient.ts`'s
 * D1Database typing.
 */

export interface R2UploadedPart {
  partNumber: number;
  etag: string;
}

export interface R2HTTPMetadata {
  contentType?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
  cacheExpiry?: Date;
}

export interface R2CreateMultipartUploadOptions {
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

export interface R2Object {
  key: string;
  etag: string;
  size: number;
}

export interface R2ObjectBody extends R2Object {
  body: ReadableStream<Uint8Array>;
}

export interface R2MultipartUpload {
  uploadPart(
    partNumber: number,
    value:
      | ReadableStream<Uint8Array>
      | ArrayBuffer
      | ArrayBufferView
      | Blob
      | string
      | Uint8Array,
  ): Promise<R2UploadedPart>;
  complete(parts: R2UploadedPart[]): Promise<R2Object>;
  abort(): Promise<void>;
}

export interface R2PutOptions {
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

export interface R2Bucket {
  createMultipartUpload(
    key: string,
    options?: R2CreateMultipartUploadOptions,
  ): Promise<R2MultipartUpload>;
  get(key: string): Promise<R2ObjectBody | null>;
  head(key: string): Promise<R2Object | null>;
  put(
    key: string,
    value: ReadableStream<Uint8Array> | ArrayBuffer | ArrayBufferView | Blob | string | Uint8Array,
    options?: R2PutOptions,
  ): Promise<R2Object>;
}

declare global {
  interface CloudflareEnv {
    BACKUPS_BUCKET?: R2Bucket;
    BOOKING_PHOTOS?: R2Bucket;
  }
}
