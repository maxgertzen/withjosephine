import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/r2", () => ({
  getSignedUploadUrl: vi.fn(),
  buildPhotoKey: vi.fn((id: string, name: string) => `submissions/${id}/photo-${name}`),
}));

vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileToken: vi.fn(),
}));

import { buildPhotoKey, getSignedUploadUrl } from "@/lib/r2";
import { verifyTurnstileToken } from "@/lib/turnstile";

const mockGetSignedUrl = vi.mocked(getSignedUploadUrl);
const mockBuildKey = vi.mocked(buildPhotoKey);
const mockVerify = vi.mocked(verifyTurnstileToken);

beforeEach(() => {
  mockGetSignedUrl.mockReset();
  mockBuildKey.mockClear();
  mockVerify.mockReset().mockResolvedValue(true);
});

const VALID_BODY = {
  filename: "moon.jpg",
  contentType: "image/jpeg",
  size: 1024,
  turnstileToken: "valid-token",
};

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
  it("rejects missing turnstile token with 400", async () => {
    const res = await callRoute({ ...VALID_BODY, turnstileToken: undefined });
    expect(res.status).toBe(400);
    expect(mockVerify).not.toHaveBeenCalled();
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it("rejects empty turnstile token with 400", async () => {
    const res = await callRoute({ ...VALID_BODY, turnstileToken: "" });
    expect(res.status).toBe(400);
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it("rejects when Turnstile verification fails", async () => {
    mockVerify.mockResolvedValueOnce(false);
    const res = await callRoute(VALID_BODY);
    expect(res.status).toBe(400);
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it("rejects unsupported mime types with 415", async () => {
    const res = await callRoute({ ...VALID_BODY, contentType: "application/pdf" });
    expect(res.status).toBe(415);
  });

  it("rejects files over 8MB with 413", async () => {
    const res = await callRoute({ ...VALID_BODY, size: 9 * 1024 * 1024 });
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

  it("returns signed URL and key on success and forwards size to signer", async () => {
    mockGetSignedUrl.mockResolvedValueOnce("https://r2.example/signed-put");
    const res = await callRoute(VALID_BODY);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { uploadUrl: string; key: string };
    expect(body.uploadUrl).toBe("https://r2.example/signed-put");
    expect(body.key).toContain("photo-moon.jpg");
    expect(mockGetSignedUrl).toHaveBeenCalledWith(body.key, "image/jpeg", 1024);
  });

  it("returns 500 when signing fails", async () => {
    mockGetSignedUrl.mockRejectedValueOnce(new Error("R2 down"));
    const res = await callRoute(VALID_BODY);
    expect(res.status).toBe(500);
  });
});
