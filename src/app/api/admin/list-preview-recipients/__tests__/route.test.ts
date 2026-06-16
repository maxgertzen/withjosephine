import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function callRoute(): Promise<Response> {
  const { GET } = await import("../route");
  return GET();
}

beforeEach(() => {
  vi.stubEnv(
    "ALLOWED_PREVIEW_RECIPIENTS",
    "hello@withjosephine.com,maxgertzen+preview@gmail.com",
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/admin/list-preview-recipients", () => {
  it("returns the allowlist without requiring an admin token", async () => {
    const response = await callRoute();
    expect(response.status).toBe(200);
    const data = (await response.json()) as { recipients: string[] };
    expect(data.recipients).toEqual([
      "hello@withjosephine.com",
      "maxgertzen+preview@gmail.com",
    ]);
  });

  it("returns 503 when ALLOWED_PREVIEW_RECIPIENTS is unset", async () => {
    vi.stubEnv("ALLOWED_PREVIEW_RECIPIENTS", "");
    const response = await callRoute();
    expect(response.status).toBe(503);
    const data = (await response.json()) as { reason: string };
    expect(data.reason).toBe("preview-not-configured");
  });
});
