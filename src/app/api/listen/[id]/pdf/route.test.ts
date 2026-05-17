import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../proxySanityAsset", async () => {
  const actual = await vi.importActual<typeof import("../proxySanityAsset")>("../proxySanityAsset");
  return {
    ...actual,
    gateListenAssetRequest: vi.fn(),
  };
});

import { gateListenAssetRequest } from "../proxySanityAsset";

const gateMock = vi.mocked(gateListenAssetRequest);

const ASSET = {
  voiceNoteUrl: "https://cdn.sanity.io/files/voice.m4a",
  pdfUrl: "https://cdn.sanity.io/files/reading.pdf",
};

const fetchMock = vi.fn();
const params = Promise.resolve({ id: "sub_1" });

beforeEach(() => {
  gateMock.mockReset().mockResolvedValue({ ok: true, asset: ASSET });
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/listen/[id]/pdf", () => {
  it("returns the upstream body with Content-Disposition: attachment", async () => {
    fetchMock.mockResolvedValue(
      new Response("pdf-bytes", { status: 200, headers: { "content-type": "application/pdf" } }),
    );
    const { GET } = await import("./route");
    const response = await GET(
      new Request("https://withjosephine.com/api/listen/sub_1/pdf"),
      { params },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="reading.pdf"',
    );
    expect(response.headers.get("content-type")).toBe("application/pdf");
  });

  it("403 on gate denial without fetching", async () => {
    gateMock.mockResolvedValue({ ok: false, response: new Response("Forbidden", { status: 403 }) });
    const { GET } = await import("./route");
    const response = await GET(
      new Request("https://withjosephine.com/api/listen/sub_1/pdf"),
      { params },
    );
    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 404 when gate.asset.pdfUrl is null", async () => {
    gateMock.mockResolvedValue({ ok: true, asset: { voiceNoteUrl: null, pdfUrl: null } });
    const { GET } = await import("./route");
    const response = await GET(
      new Request("https://withjosephine.com/api/listen/sub_1/pdf"),
      { params },
    );
    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
