import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { requireEnv } from "./env";

const FILENAME_MAX_LENGTH = 80;
const SAFE_FILENAME_CHARS = /[^a-z0-9._-]/g;

let cachedClient: S3Client | null = null;

function getR2Client(): S3Client {
  if (cachedClient) return cachedClient;

  const accountId = requireEnv("R2_ACCOUNT_ID");
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");

  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return cachedClient;
}

function getBucketName(): string {
  return requireEnv("R2_BUCKET_NAME");
}

export async function getSignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 300,
): Promise<string> {
  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

export async function deleteObject(key: string): Promise<void> {
  const client = getR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    }),
  );
}

export function buildPhotoKey(submissionId: string, originalFilename: string): string {
  const sanitized = originalFilename
    .toLowerCase()
    .replace(SAFE_FILENAME_CHARS, "-")
    .slice(0, FILENAME_MAX_LENGTH);
  const timestamp = Date.now();
  return `submissions/${submissionId}/photo-${timestamp}-${sanitized}`;
}
