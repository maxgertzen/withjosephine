import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../proxySanityAsset", async () => {
  const actual = await vi.importActual<typeof import("../proxySanityAsset")>("../proxySanityAsset");
  return {
    ...actual,
    gateListenAssetRequest: vi.fn(),
  };
});
vi.mock("@/lib/booking/submissions", () => ({
  scheduleListenedAtMirror: vi.fn(),
}));

import { scheduleListenedAtMirror } from "@/lib/booking/submissions";

import { gateListenAssetRequest } from "../proxySanityAsset";

const gateMock = vi.mocked(gateListenAssetRequest);
const markListenedMock = vi.mocked(scheduleListenedAtMirror);

const VOICE_URL = "https://cdn.sanity.io/files/voice.m4a";
const PDF_URL = "https://cdn.sanity.io/files/reading.pdf";

const ASSET = {
  voiceNoteUrl: VOICE_URL,
  pdfUrl: PDF_URL,
  readingSlug: "soul-blueprint",
  readingName: "Soul Blueprint",
  submissionId: "sub_1",
  firstName: "Test",
  lastName: "User",
};

const fetchMock = vi.fn();

beforeEach(() => {
  gateMock.mockReset().mockResolvedValue({ ok: true, asset: ASSET });
  markListenedMock.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function audioRequest(opts: { range?: string } = {}): Request {
  const headers = new Headers();
  if (opts.range) headers.set("range", opts.range);
  return new Request("https://withjosephine.com/api/listen/sub_1/audio", { headers });
}

const params = Promise.resolve({ id: "sub_1" });

describe("GET /api/listen/[id]/audio", () => {
  it("on gate denial: returns the gate's response, never fetches Sanity", async () => {
    gateMock.mockResolvedValue({ ok: false, response: new Response("Forbidden", { status: 403 }) });
    const { GET } = await import("./route");
    const response = await GET(audioRequest(), { params });
    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards Range header to Sanity and proxies the body", async () => {
    fetchMock.mockResolvedValue(
      new Response("partial-bytes", {
        status: 206,
        headers: {
          "content-type": "audio/mpeg",
          "content-range": "bytes 100-199/1000",
          "accept-ranges": "bytes",
        },
      }),
    );
    const { GET } = await import("./route");
    const response = await GET(audioRequest({ range: "bytes=100-199" }), { params });
    expect(response.status).toBe(206);
    expect(fetchMock).toHaveBeenCalledWith(
      VOICE_URL,
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
    const fetchHeaders = fetchMock.mock.calls[0]?.[1].headers as Headers;
    expect(fetchHeaders.get("range")).toBe("bytes=100-199");
    const disposition = response.headers.get("content-disposition");
    expect(disposition).toContain("inline");
    expect(disposition).toContain('filename="Test User Soul Blueprint.m4a"');
    expect(disposition).toContain("filename*=UTF-8''Test%20User%20Soul%20Blueprint.m4a");
  });

  it("uses human-readable name in content-disposition when name fields are present", async () => {
    fetchMock.mockResolvedValue(new Response("ok", { status: 200 }));
    const { GET } = await import("./route");
    const response = await GET(audioRequest(), { params });
    const disposition = response.headers.get("content-disposition");
    expect(disposition).toContain('filename="Test User Soul Blueprint.m4a"');
  });

  it("falls back to reading slug in content-disposition when name fields are absent", async () => {
    gateMock.mockResolvedValueOnce({
      ok: true,
      asset: {
        ...ASSET,
        firstName: null,
        lastName: null,
        readingName: null,
      },
    });
    fetchMock.mockResolvedValue(new Response("ok", { status: 200 }));
    const { GET } = await import("./route");
    const response = await GET(audioRequest(), { params });
    const disposition = response.headers.get("content-disposition");
    expect(disposition).toContain('filename="soul-blueprint.m4a"');
  });

  it("fires scheduleListenedAtMirror on opener (no Range header)", async () => {
    fetchMock.mockResolvedValue(new Response("ok", { status: 200 }));
    const { GET } = await import("./route");
    await GET(audioRequest(), { params });
    expect(markListenedMock).toHaveBeenCalledOnce();
  });

  it("fires scheduleListenedAtMirror on bytes=0- opener", async () => {
    fetchMock.mockResolvedValue(new Response("ok", { status: 206 }));
    const { GET } = await import("./route");
    await GET(audioRequest({ range: "bytes=0-" }), { params });
    expect(markListenedMock).toHaveBeenCalledOnce();
  });

  it("does NOT fire scheduleListenedAtMirror on mid-file Range chunks", async () => {
    fetchMock.mockResolvedValue(new Response("ok", { status: 206 }));
    const { GET } = await import("./route");
    await GET(audioRequest({ range: "bytes=12345-67890" }), { params });
    expect(markListenedMock).not.toHaveBeenCalled();
  });

  it("does NOT fire scheduleListenedAtMirror on upstream non-2xx", async () => {
    fetchMock.mockResolvedValue(new Response("nope", { status: 502 }));
    const { GET } = await import("./route");
    await GET(audioRequest(), { params });
    expect(markListenedMock).not.toHaveBeenCalled();
  });

  it("returns 404 when gate.asset.voiceNoteUrl is null", async () => {
    gateMock.mockResolvedValueOnce({
      ok: true,
      asset: {
        ...ASSET,
        voiceNoteUrl: null,
        pdfUrl: null,
      },
    });
    const { GET } = await import("./route");
    const response = await GET(audioRequest(), { params });
    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
