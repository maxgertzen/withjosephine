// @vitest-environment node
// R2 signing builds Requests with `Content-Length`, which the Fetch spec
// marks as a forbidden header that browser-shaped environments (happy-dom,
// jsdom) silently drop. Cloudflare Workers (the production runtime) does
// not enforce that restriction. Run this file in the Node environment so
// the test mirrors what the worker actually sees.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signMock = vi.fn();
const fetchMock = vi.fn();
const clientCtorMock = vi.fn(function () {
  return { sign: signMock, fetch: fetchMock };
});

vi.mock("aws4fetch", () => ({
  AwsClient: clientCtorMock,
}));

beforeEach(() => {
  vi.resetModules();
  signMock.mockReset();
  fetchMock.mockReset();
  clientCtorMock.mockClear();
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
  it("signs a PUT request with content-type, content-length, and the configured expiry", async () => {
    signMock.mockResolvedValue({ url: "https://signed.example/url?X-Amz-Signature=abc" });
    const { getSignedUploadUrl } = await import("./r2");

    const result = await getSignedUploadUrl("path/to/photo.jpg", "image/jpeg", 1234);

    expect(result).toBe("https://signed.example/url?X-Amz-Signature=abc");
    expect(signMock).toHaveBeenCalledOnce();
    const [signedRequest, options] = signMock.mock.calls[0]!;
    expect(signedRequest.method).toBe("PUT");
    expect(signedRequest.headers.get("Content-Type")).toBe("image/jpeg");
    expect(signedRequest.headers.get("Content-Length")).toBe("1234");
    const url = new URL(signedRequest.url);
    expect(url.host).toBe("acct_test.r2.cloudflarestorage.com");
    expect(url.pathname).toBe("/bucket-test/path/to/photo.jpg");
    expect(url.searchParams.get("X-Amz-Expires")).toBe("300");
    expect(options).toEqual({ aws: { signQuery: true } });
  });

  it("respects custom expiresInSeconds", async () => {
    signMock.mockResolvedValue({ url: "https://signed.example/url" });
    const { getSignedUploadUrl } = await import("./r2");
    await getSignedUploadUrl("k", "image/png", 100, 60);
    const signedRequest = signMock.mock.calls[0]![0];
    expect(new URL(signedRequest.url).searchParams.get("X-Amz-Expires")).toBe("60");
  });

  it("instantiates AwsClient with the R2 credentials and region", async () => {
    signMock.mockResolvedValue({ url: "u" });
    const { getSignedUploadUrl } = await import("./r2");
    await getSignedUploadUrl("k", "image/jpeg", 100);

    expect(clientCtorMock).toHaveBeenCalledWith({
      accessKeyId: "AKID",
      secretAccessKey: "SECRET",
      service: "s3",
      region: "auto",
    });
  });
});

describe("deleteObject", () => {
  it("issues a DELETE against the bucket+key URL", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const { deleteObject } = await import("./r2");
    await deleteObject("submissions/sub_1/photo.jpg");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toBe(
      "https://acct_test.r2.cloudflarestorage.com/bucket-test/submissions/sub_1/photo.jpg",
    );
    expect(options.method).toBe("DELETE");
  });

  it("treats 404 as a no-op (object already gone)", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    const { deleteObject } = await import("./r2");
    await expect(deleteObject("missing")).resolves.toBeUndefined();
  });

  it("throws on non-2xx, non-404 responses", async () => {
    fetchMock.mockResolvedValue(new Response("oops", { status: 500 }));
    const { deleteObject } = await import("./r2");
    await expect(deleteObject("k")).rejects.toThrow(/R2 delete failed: 500/);
  });
});

describe("listObjectsByPrefix", () => {
  function makeListXml(
    contents: Array<{ key: string; lastModified: string }>,
    options: { isTruncated?: boolean; nextToken?: string | null } = {},
  ): string {
    const isTruncated = options.isTruncated ?? false;
    const next = options.nextToken
      ? `<NextContinuationToken>${options.nextToken}</NextContinuationToken>`
      : "";
    const items = contents
      .map(
        (entry) =>
          `<Contents><Key>${entry.key}</Key><LastModified>${entry.lastModified}</LastModified></Contents>`,
      )
      .join("");
    return `<?xml version="1.0"?><ListBucketResult><IsTruncated>${isTruncated}</IsTruncated>${next}${items}</ListBucketResult>`;
  }

  it("parses single-page results into {key, lastModified}", async () => {
    const ts = "2026-04-20T12:00:00.000Z";
    fetchMock.mockResolvedValueOnce(
      new Response(
        makeListXml([
          { key: "submissions/a/photo.jpg", lastModified: ts },
          { key: "submissions/b/photo.png", lastModified: ts },
        ]),
        { status: 200 },
      ),
    );
    const { listObjectsByPrefix } = await import("./r2");
    const result = await listObjectsByPrefix("submissions/");
    expect(result).toEqual([
      { key: "submissions/a/photo.jpg", lastModified: new Date(ts) },
      { key: "submissions/b/photo.png", lastModified: new Date(ts) },
    ]);
    expect(fetchMock).toHaveBeenCalledOnce();
    const url = new URL(fetchMock.mock.calls[0]![0]);
    expect(url.searchParams.get("list-type")).toBe("2");
    expect(url.searchParams.get("prefix")).toBe("submissions/");
  });

  it("paginates via NextContinuationToken until IsTruncated is false", async () => {
    const ts = "2026-04-20T12:00:00.000Z";
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          makeListXml([{ key: "k1", lastModified: ts }], {
            isTruncated: true,
            nextToken: "token-1",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(makeListXml([{ key: "k2", lastModified: ts }]), { status: 200 }),
      );
    const { listObjectsByPrefix } = await import("./r2");
    const result = await listObjectsByPrefix("submissions/");
    expect(result.map((r) => r.key)).toEqual(["k1", "k2"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondUrl = new URL(fetchMock.mock.calls[1]![0]);
    expect(secondUrl.searchParams.get("continuation-token")).toBe("token-1");
  });

  it("skips entries missing Key or LastModified", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        makeListXml([
          { key: "good", lastModified: "2026-04-20T12:00:00.000Z" },
        ]) +
          "<Contents><LastModified>2026-04-20T00:00:00Z</LastModified></Contents>" +
          "<Contents><Key>missing-date</Key></Contents>",
        { status: 200 },
      ),
    );
    const { listObjectsByPrefix } = await import("./r2");
    const result = await listObjectsByPrefix("submissions/");
    expect(result.map((r) => r.key)).toEqual(["good"]);
  });

  it("returns empty array when no objects match the prefix", async () => {
    fetchMock.mockResolvedValueOnce(new Response(makeListXml([]), { status: 200 }));
    const { listObjectsByPrefix } = await import("./r2");
    const result = await listObjectsByPrefix("submissions/");
    expect(result).toEqual([]);
  });

  it("throws on non-2xx responses", async () => {
    fetchMock.mockResolvedValueOnce(new Response("denied", { status: 403 }));
    const { listObjectsByPrefix } = await import("./r2");
    await expect(listObjectsByPrefix("submissions/")).rejects.toThrow(/R2 list failed: 403/);
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
