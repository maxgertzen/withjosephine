import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/r2", () => ({
  getSignedUploadUrl: vi.fn(),
  buildPhotoKey: vi.fn((id: string, name: string) => `submissions/${id}/photo-${name}`),
}));

import { buildPhotoKey, getSignedUploadUrl } from "@/lib/r2";
const mockGetSignedUrl = vi.mocked(getSignedUploadUrl);
const mockBuildKey = vi.mocked(buildPhotoKey);

beforeEach(() => {
  mockGetSignedUrl.mockReset();
  mockBuildKey.mockClear();
});

async function callRoute(body: unknown): Promise<Response> {
  const { POST } = await import("../route");
  return POST(
    new Request("http://localhost/api/booking/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("/api/booking/upload-url", () => {
  it("rejects unsupported mime types with 415", async () => {
    const res = await callRoute({
      filename: "doc.pdf",
      contentType: "application/pdf",
      size: 1024,
    });
    expect(res.status).toBe(415);
  });

  it("rejects files over 8MB with 413", async () => {
    const res = await callRoute({
      filename: "huge.jpg",
      contentType: "image/jpeg",
      size: 9 * 1024 * 1024,
    });
    expect(res.status).toBe(413);
  });

  it("rejects non-JSON body with 400", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      new Request("http://localhost/api/booking/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns signed URL and key on success", async () => {
    mockGetSignedUrl.mockResolvedValueOnce("https://r2.example/signed-put");
    const res = await callRoute({
      filename: "moon.jpg",
      contentType: "image/jpeg",
      size: 1024,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { uploadUrl: string; key: string };
    expect(body.uploadUrl).toBe("https://r2.example/signed-put");
    expect(body.key).toContain("photo-moon.jpg");
    expect(mockGetSignedUrl).toHaveBeenCalledWith(body.key, "image/jpeg");
  });

  it("returns 500 when signing fails", async () => {
    mockGetSignedUrl.mockRejectedValueOnce(new Error("R2 down"));
    const res = await callRoute({
      filename: "moon.jpg",
      contentType: "image/jpeg",
      size: 1024,
    });
    expect(res.status).toBe(500);
  });
});
