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
  readingSlug: "soul-blueprint",
  readingName: "Soul Blueprint",
  submissionId: "sub_1",
  firstName: "Test",
  lastName: "User",
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
  it("returns the upstream body with Content-Disposition: attachment and human-readable name", async () => {
    fetchMock.mockResolvedValue(
      new Response("pdf-bytes", { status: 200, headers: { "content-type": "application/pdf" } }),
    );
    const { GET } = await import("./route");
    const response = await GET(
      new Request("https://withjosephine.com/api/listen/sub_1/pdf"),
      { params },
    );
    expect(response.status).toBe(200);
    const disposition = response.headers.get("content-disposition");
    expect(disposition).toContain("attachment");
    expect(disposition).toContain('filename="Test User Soul Blueprint.pdf"');
    expect(disposition).toContain("filename*=UTF-8''Test%20User%20Soul%20Blueprint.pdf");
    expect(response.headers.get("content-type")).toBe("application/pdf");
  });

  it("uses name fields from a different reading when asset context carries them", async () => {
    gateMock.mockResolvedValue({
      ok: true,
      asset: {
        ...ASSET,
        readingSlug: "akashic-record",
        readingName: "Akashic Record Reading",
        submissionId: "sub_42",
        firstName: "Ada",
        lastName: "Lovelace",
      },
    });
    fetchMock.mockResolvedValue(
      new Response("pdf-bytes", { status: 200, headers: { "content-type": "application/pdf" } }),
    );
    const { GET } = await import("./route");
    const response = await GET(
      new Request("https://withjosephine.com/api/listen/sub_42/pdf"),
      { params: Promise.resolve({ id: "sub_42" }) },
    );
    const disposition = response.headers.get("content-disposition");
    expect(disposition).toContain('filename="Ada Lovelace Akashic Record Reading.pdf"');
  });

  it("falls back to reading slug when name fields are absent", async () => {
    gateMock.mockResolvedValue({
      ok: true,
      asset: {
        ...ASSET,
        firstName: null,
        lastName: null,
        readingName: null,
      },
    });
    fetchMock.mockResolvedValue(
      new Response("pdf-bytes", { status: 200, headers: { "content-type": "application/pdf" } }),
    );
    const { GET } = await import("./route");
    const response = await GET(
      new Request("https://withjosephine.com/api/listen/sub_1/pdf"),
      { params },
    );
    const disposition = response.headers.get("content-disposition");
    expect(disposition).toContain('filename="soul-blueprint.pdf"');
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
    gateMock.mockResolvedValue({
      ok: true,
      asset: {
        ...ASSET,
        voiceNoteUrl: null,
        pdfUrl: null,
      },
    });
    const { GET } = await import("./route");
    const response = await GET(
      new Request("https://withjosephine.com/api/listen/sub_1/pdf"),
      { params },
    );
    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
