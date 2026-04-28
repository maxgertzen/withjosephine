import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();
const s3CtorMock = vi.fn(function () {
  return { send: sendMock };
});
const putObjectCommandCtor = vi.fn(function (input: unknown) {
  return { input };
});
const deleteObjectCommandCtor = vi.fn(function (input: unknown) {
  return { input };
});
const getSignedUrlMock = vi.fn();

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: s3CtorMock,
  PutObjectCommand: putObjectCommandCtor,
  DeleteObjectCommand: deleteObjectCommandCtor,
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: getSignedUrlMock,
}));

beforeEach(() => {
  vi.resetModules();
  sendMock.mockReset();
  s3CtorMock.mockClear();
  putObjectCommandCtor.mockClear();
  deleteObjectCommandCtor.mockClear();
  getSignedUrlMock.mockReset();
  vi.stubEnv("R2_ACCOUNT_ID", "acct_test");
  vi.stubEnv("R2_ACCESS_KEY_ID", "AKID");
  vi.stubEnv("R2_SECRET_ACCESS_KEY", "SECRET");
  vi.stubEnv("R2_BUCKET_NAME", "bucket-test");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("buildPhotoKey", () => {
  it("builds a key under submissions/<id>/ with timestamp prefix and sanitized name", async () => {
    const { buildPhotoKey } = await import("./r2");
    const key = buildPhotoKey("sub_123", "Birth Chart Photo!.JPG");

    expect(key).toMatch(/^submissions\/sub_123\/photo-\d+-birth-chart-photo-\.jpg$/);
  });

  it("preserves dots, dashes, and underscores in the original filename", async () => {
    const { buildPhotoKey } = await import("./r2");
    const key = buildPhotoKey("sub_1", "my_photo-v2.png");
    expect(key).toMatch(/photo-\d+-my_photo-v2\.png$/);
  });

  it("truncates filenames longer than 80 characters", async () => {
    const { buildPhotoKey } = await import("./r2");
    const longName = `${"a".repeat(100)}.jpg`;
    const key = buildPhotoKey("sub_1", longName);
    const filename = key.split("-").slice(-1)[0]!;
    expect(filename.length).toBeLessThanOrEqual(80);
  });
});

describe("getSignedUploadUrl", () => {
  it("calls getSignedUrl with PutObjectCommand built from the bucket, key, and content type", async () => {
    getSignedUrlMock.mockResolvedValue("https://signed.example/url");
    const { getSignedUploadUrl } = await import("./r2");

    const result = await getSignedUploadUrl("path/to/photo.jpg", "image/jpeg");

    expect(result).toBe("https://signed.example/url");
    expect(putObjectCommandCtor).toHaveBeenCalledWith({
      Bucket: "bucket-test",
      Key: "path/to/photo.jpg",
      ContentType: "image/jpeg",
    });
    expect(getSignedUrlMock).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
      expiresIn: 300,
    });
  });

  it("respects custom expiresInSeconds", async () => {
    getSignedUrlMock.mockResolvedValue("https://signed.example/url");
    const { getSignedUploadUrl } = await import("./r2");

    await getSignedUploadUrl("path/photo.jpg", "image/png", 60);

    expect(getSignedUrlMock).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
      expiresIn: 60,
    });
  });

  it("instantiates the S3 client with the R2 endpoint and credentials", async () => {
    getSignedUrlMock.mockResolvedValue("u");
    const { getSignedUploadUrl } = await import("./r2");
    await getSignedUploadUrl("k", "image/jpeg");

    expect(s3CtorMock).toHaveBeenCalledWith({
      region: "auto",
      endpoint: "https://acct_test.r2.cloudflarestorage.com",
      credentials: { accessKeyId: "AKID", secretAccessKey: "SECRET" },
    });
  });
});

describe("deleteObject", () => {
  it("sends a DeleteObjectCommand for the given key", async () => {
    sendMock.mockResolvedValue({});
    const { deleteObject } = await import("./r2");

    await deleteObject("submissions/sub_1/photo.jpg");

    expect(deleteObjectCommandCtor).toHaveBeenCalledWith({
      Bucket: "bucket-test",
      Key: "submissions/sub_1/photo.jpg",
    });
    expect(sendMock).toHaveBeenCalled();
  });
});

describe("missing env", () => {
  it("throws when R2_ACCOUNT_ID is missing", async () => {
    vi.stubEnv("R2_ACCOUNT_ID", "");
    const { getSignedUploadUrl } = await import("./r2");
    await expect(getSignedUploadUrl("k", "image/jpeg")).rejects.toThrow(
      "Missing required env var: R2_ACCOUNT_ID",
    );
  });

  it("throws when R2_BUCKET_NAME is missing", async () => {
    vi.stubEnv("R2_BUCKET_NAME", "");
    const { deleteObject } = await import("./r2");
    await expect(deleteObject("k")).rejects.toThrow("Missing required env var: R2_BUCKET_NAME");
  });
});
