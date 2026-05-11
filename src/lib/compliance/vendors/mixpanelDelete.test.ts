import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMixpanelDataDeletion } from "./mixpanelDelete";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_MIXPANEL_TOKEN", "proj_token_abc");
  vi.stubEnv("MIXPANEL_SERVICE_ACCOUNT_TOKEN", "svc_token_xyz");
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("createMixpanelDataDeletion", () => {
  it("returns ok=false on empty distinctIds", async () => {
    const result = await createMixpanelDataDeletion([]);
    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns vendorNotConfigured when service-account token missing", async () => {
    vi.stubEnv("MIXPANEL_SERVICE_ACCOUNT_TOKEN", "");
    const result = await createMixpanelDataDeletion(["sub_1"]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns vendorNotConfigured when project token missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_MIXPANEL_TOKEN", "");
    const result = await createMixpanelDataDeletion(["sub_1"]);
    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("POSTs to US data-deletions/v3.0 with project token in query + Bearer header + GDPR body", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ tracking_id: "task_777" }), { status: 201 }),
    );

    const result = await createMixpanelDataDeletion(["sub_1", "sub_2"]);
    expect(result).toEqual({ ok: true, trackingId: "task_777" });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://mixpanel.com/api/app/data-deletions/v3.0?token=proj_token_abc");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer svc_token_xyz");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body as string)).toEqual({
      distinct_ids: ["sub_1", "sub_2"],
      compliance_type: "GDPR",
    });
  });

  it("falls back to results.tracking_id when root tracking_id absent", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ results: { tracking_id: 99 } }), { status: 201 }),
    );
    const result = await createMixpanelDataDeletion(["sub_1"]);
    expect(result).toEqual({ ok: true, trackingId: "99" });
  });

  it("returns ok=false on HTTP 4xx with body excerpt", async () => {
    fetchMock.mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }));
    const result = await createMixpanelDataDeletion(["sub_1"]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("HTTP 401");
  });
});
