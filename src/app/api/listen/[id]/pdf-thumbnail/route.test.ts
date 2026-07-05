import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../proxySanityAsset", async () => {
  const actual = await vi.importActual<typeof import("../proxySanityAsset")>("../proxySanityAsset");
  return {
    ...actual,
    gateListenAssetRequest: vi.fn(),
  };
});

const sanityFetchMock = vi.fn();
vi.mock("@/lib/sanity/client", () => ({
  getSanityFreshReadClient: vi.fn(async () => ({ fetch: sanityFetchMock })),
}));

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

function request(): Request {
  return new Request("https://withjosephine.com/api/listen/sub_1/pdf-thumbnail");
}

beforeEach(() => {
  gateMock.mockReset().mockResolvedValue({ ok: true, asset: ASSET });
  sanityFetchMock.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/listen/[id]/pdf-thumbnail", () => {
  it("streams the thumbnail inline when one exists", async () => {
    sanityFetchMock.mockResolvedValue("https://cdn.sanity.io/images/thumb.png");
    fetchMock.mockResolvedValue(
      new Response("png-bytes", { status: 200, headers: { "content-type": "image/png" } }),
    );
    const { GET } = await import("./route");
    const response = await GET(request(), { params });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toBe("inline");
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(fetchMock).toHaveBeenCalledWith("https://cdn.sanity.io/images/thumb.png");
  });

  it("403 on gate denial without touching Sanity or the CDN", async () => {
    gateMock.mockResolvedValue({ ok: false, response: new Response("Forbidden", { status: 403 }) });
    const { GET } = await import("./route");
    const response = await GET(request(), { params });
    expect(response.status).toBe(403);
    expect(sanityFetchMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("404 when no thumbnail is set (client swaps in the placeholder)", async () => {
    sanityFetchMock.mockResolvedValue(null);
    const { GET } = await import("./route");
    const response = await GET(request(), { params });
    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("404 when the upstream image fetch fails", async () => {
    sanityFetchMock.mockResolvedValue("https://cdn.sanity.io/images/thumb.png");
    fetchMock.mockResolvedValue(new Response("nope", { status: 502 }));
    const { GET } = await import("./route");
    const response = await GET(request(), { params });
    expect(response.status).toBe(404);
  });
});
