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
const listObjectsV2CommandCtor = vi.fn(function (input: unknown) {
  return { type: "ListObjectsV2", input };
});
const getSignedUrlMock = vi.fn();

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: s3CtorMock,
  PutObjectCommand: putObjectCommandCtor,
  DeleteObjectCommand: deleteObjectCommandCtor,
  ListObjectsV2Command: listObjectsV2CommandCtor,
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
  listObjectsV2CommandCtor.mockClear();
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
  it("signs a PutObjectCommand with bucket, key, content type, content length, and 300s default expiry", async () => {
    getSignedUrlMock.mockResolvedValue("https://signed.example/url");
    const { getSignedUploadUrl } = await import("./r2");

    const result = await getSignedUploadUrl("path/to/photo.jpg", "image/jpeg", 1234);

    expect(result).toBe("https://signed.example/url");
    expect(putObjectCommandCtor).toHaveBeenCalledWith({
      Bucket: "bucket-test",
      Key: "path/to/photo.jpg",
      ContentType: "image/jpeg",
      ContentLength: 1234,
    });

    const [signedClient, signedCommand, signedOptions] = getSignedUrlMock.mock.calls[0]!;
    expect(signedClient).toBe(s3CtorMock.mock.results[0]?.value);
    expect(signedCommand).toBe(putObjectCommandCtor.mock.results[0]?.value);
    expect(signedOptions.expiresIn).toBe(300);
    expect(signedOptions.unhoistableHeaders).toBeInstanceOf(Set);
    expect((signedOptions.unhoistableHeaders as Set<string>).has("content-length")).toBe(true);
  });

  it("respects custom expiresInSeconds", async () => {
    getSignedUrlMock.mockResolvedValue("https://signed.example/url");
    const { getSignedUploadUrl } = await import("./r2");

    await getSignedUploadUrl("path/photo.jpg", "image/png", 100, 60);

    expect(getSignedUrlMock.mock.calls[0]?.[2].expiresIn).toBe(60);
  });

  it("instantiates the S3 client with the R2 endpoint and credentials", async () => {
    getSignedUrlMock.mockResolvedValue("u");
    const { getSignedUploadUrl } = await import("./r2");
    await getSignedUploadUrl("k", "image/jpeg", 100);

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
    await expect(getSignedUploadUrl("k", "image/jpeg", 100)).rejects.toThrow(
      "Missing required env var: R2_ACCOUNT_ID",
    );
  });

  it("throws when R2_BUCKET_NAME is missing", async () => {
    vi.stubEnv("R2_BUCKET_NAME", "");
    const { deleteObject } = await import("./r2");
    await expect(deleteObject("k")).rejects.toThrow("Missing required env var: R2_BUCKET_NAME");
  });
});

describe("listObjectsByPrefix", () => {
  it("returns single-page results mapped to {key, lastModified}", async () => {
    const ts = new Date("2026-04-20T12:00:00Z");
    sendMock.mockResolvedValueOnce({
      Contents: [
        { Key: "submissions/a/photo.jpg", LastModified: ts },
        { Key: "submissions/b/photo.png", LastModified: ts },
      ],
      IsTruncated: false,
    });
    const { listObjectsByPrefix } = await import("./r2");

    const result = await listObjectsByPrefix("submissions/");

    expect(result).toEqual([
      { key: "submissions/a/photo.jpg", lastModified: ts },
      { key: "submissions/b/photo.png", lastModified: ts },
    ]);
    expect(listObjectsV2CommandCtor).toHaveBeenCalledOnce();
    expect(listObjectsV2CommandCtor.mock.calls[0]?.[0]).toMatchObject({
      Bucket: "bucket-test",
      Prefix: "submissions/",
    });
  });

  it("paginates via NextContinuationToken until IsTruncated is false", async () => {
    const ts = new Date("2026-04-20T12:00:00Z");
    sendMock
      .mockResolvedValueOnce({
        Contents: [{ Key: "k1", LastModified: ts }],
        IsTruncated: true,
        NextContinuationToken: "token-1",
      })
      .mockResolvedValueOnce({
        Contents: [{ Key: "k2", LastModified: ts }],
        IsTruncated: false,
      });
    const { listObjectsByPrefix } = await import("./r2");

    const result = await listObjectsByPrefix("submissions/");

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.key)).toEqual(["k1", "k2"]);
    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(listObjectsV2CommandCtor.mock.calls[1]?.[0]).toMatchObject({
      ContinuationToken: "token-1",
    });
  });

  it("skips entries missing Key or LastModified", async () => {
    sendMock.mockResolvedValueOnce({
      Contents: [
        { Key: "good", LastModified: new Date() },
        { Key: undefined, LastModified: new Date() },
        { Key: "no-date" },
      ],
      IsTruncated: false,
    });
    const { listObjectsByPrefix } = await import("./r2");
    const result = await listObjectsByPrefix("submissions/");
    expect(result.map((r) => r.key)).toEqual(["good"]);
  });

  it("returns empty array when no objects match the prefix", async () => {
    sendMock.mockResolvedValueOnce({ Contents: undefined, IsTruncated: false });
    const { listObjectsByPrefix } = await import("./r2");
    const result = await listObjectsByPrefix("submissions/");
    expect(result).toEqual([]);
  });
});
