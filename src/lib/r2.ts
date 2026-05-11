import { AwsClient } from "aws4fetch";

import { requireEnv } from "./env";
import { taintServerObject } from "./taint";

const FILENAME_MAX_LENGTH = 80;
const SAFE_FILENAME_CHARS = /[^a-z0-9._-]/g;

let cachedClient: AwsClient | null = null;
let cachedAccountId: string | null = null;

function getR2() {
  if (cachedClient && cachedAccountId) {
    return { client: cachedClient, accountId: cachedAccountId };
  }
  cachedAccountId = requireEnv("R2_ACCOUNT_ID");
  cachedClient = new AwsClient({
    accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    service: "s3",
    region: "auto",
  });
  taintServerObject(
    "R2 AwsClient carries R2_SECRET_ACCESS_KEY; do not pass to client components.",
    cachedClient,
  );
  return { client: cachedClient, accountId: cachedAccountId };
}

function getBucketName() {
  return requireEnv("R2_BUCKET_NAME");
}

function objectUrl(accountId: string, bucket: string, key: string) {
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${encodedKey}`;
}

/**
 * Sign a PUT URL bound to a specific Content-Type and Content-Length so the
 * actual upload must match the bytes the API claimed. Mirrors the S3 SDK's
 * `getSignedUrl(PutObjectCommand)` flow but in ~10 KB instead of ~2 MiB.
 */
export async function getSignedUploadUrl(
  key: string,
  contentType: string,
  contentLength: number,
  expiresInSeconds = 300,
): Promise<string> {
  const { client, accountId } = getR2();
  const url = new URL(objectUrl(accountId, getBucketName(), key));
  url.searchParams.set("X-Amz-Expires", String(expiresInSeconds));

  const signed = await client.sign(
    new Request(url.toString(), {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(contentLength),
      },
    }),
    { aws: { signQuery: true } },
  );
  return signed.url;
}

export type R2ObjectSummary = { key: string; lastModified: Date };

type ListBucketResultEntry = { Key?: string; LastModified?: string };

function decodeXmlEntities(text: string) {
  return text
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function parseListResponse(xml: string): {
  contents: ListBucketResultEntry[];
  isTruncated: boolean;
  nextContinuationToken: string | null;
} {
  const isTruncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
  const tokenMatch = xml.match(/<NextContinuationToken>([^<]*)<\/NextContinuationToken>/);
  const nextContinuationToken = tokenMatch ? decodeXmlEntities(tokenMatch[1]!) : null;
  const contents: ListBucketResultEntry[] = [];
  const contentRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
  let match: RegExpExecArray | null;
  while ((match = contentRegex.exec(xml)) !== null) {
    const block = match[1]!;
    const keyMatch = block.match(/<Key>([^<]*)<\/Key>/);
    const dateMatch = block.match(/<LastModified>([^<]*)<\/LastModified>/);
    contents.push({
      Key: keyMatch ? decodeXmlEntities(keyMatch[1]!) : undefined,
      LastModified: dateMatch ? dateMatch[1]! : undefined,
    });
  }
  return { contents, isTruncated, nextContinuationToken };
}

export async function listObjectsByPrefix(prefix: string): Promise<R2ObjectSummary[]> {
  const { client, accountId } = getR2();
  const bucket = getBucketName();
  const summaries: R2ObjectSummary[] = [];
  let continuationToken: string | null = null;

  do {
    const url = new URL(`https://${accountId}.r2.cloudflarestorage.com/${bucket}`);
    url.searchParams.set("list-type", "2");
    url.searchParams.set("prefix", prefix);
    if (continuationToken) {
      url.searchParams.set("continuation-token", continuationToken);
    }
    const response = await client.fetch(url.toString());
    if (!response.ok) {
      throw new Error(`R2 list failed: ${response.status} ${await response.text()}`);
    }
    const xml = await response.text();
    const parsed = parseListResponse(xml);
    for (const entry of parsed.contents) {
      if (!entry.Key || !entry.LastModified) continue;
      summaries.push({ key: entry.Key, lastModified: new Date(entry.LastModified) });
    }
    continuationToken = parsed.isTruncated ? parsed.nextContinuationToken : null;
  } while (continuationToken);

  return summaries;
}

export async function deleteObject(key: string): Promise<void> {
  const { client, accountId } = getR2();
  const response = await client.fetch(objectUrl(accountId, getBucketName(), key), {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`R2 delete failed: ${response.status} ${await response.text()}`);
  }
}

/**
 * Server-side PUT of an in-memory body. Used by the Phase 4 Art. 20 export
 * endpoint to upload a ZIP under `exports/`. Throws on non-2xx so the caller
 * can surface the failure to the user.
 */
export async function putObject(
  key: string,
  body: ArrayBuffer | Uint8Array,
  contentType: string,
): Promise<void> {
  const { client, accountId } = getR2();
  // Blob wrap normalises Uint8Array/ArrayBuffer to a `BodyInit` shape the
  // worker fetch typing accepts. TS narrows Uint8Array<ArrayBufferLike> in
  // a way that's incompatible with BlobPart's stricter ArrayBuffer constraint
  // (the SharedArrayBuffer carve-out); the cast is safe at runtime since
  // workerd never produces SharedArrayBuffer-backed Uint8Arrays from fflate.
  const blob = new Blob([body as BlobPart], { type: contentType });
  const response = await client.fetch(objectUrl(accountId, getBucketName(), key), {
    method: "PUT",
    headers: { "Content-Type": contentType, "Content-Length": String(body.byteLength) },
    body: blob,
  });
  if (!response.ok) {
    throw new Error(`R2 PUT failed: ${response.status} ${await response.text()}`);
  }
}

/**
 * Pre-signed GET URL for download. Phase 4 Art. 20 export uses this to
 * deliver the bundle ZIP without exposing the R2 bucket publicly. Default
 * 7-day expiry matches the locked PRD spec.
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds = 7 * 24 * 60 * 60,
): Promise<string> {
  const { client, accountId } = getR2();
  const url = new URL(objectUrl(accountId, getBucketName(), key));
  url.searchParams.set("X-Amz-Expires", String(expiresInSeconds));
  const signed = await client.sign(
    new Request(url.toString(), { method: "GET" }),
    { aws: { signQuery: true } },
  );
  return signed.url;
}

export function buildPhotoKey(submissionId: string, originalFilename: string): string {
  const sanitized = originalFilename
    .toLowerCase()
    .replace(SAFE_FILENAME_CHARS, "-")
    .slice(0, FILENAME_MAX_LENGTH);
  const timestamp = Date.now();
  return `submissions/${submissionId}/photo-${timestamp}-${sanitized}`;
}

// Test-only: reset cached clients so vi.stubEnv changes apply between tests.
export function __resetR2ClientForTesting() {
  cachedClient = null;
  cachedAccountId = null;
}
