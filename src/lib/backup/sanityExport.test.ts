import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchSanityExportStream,
  SANITY_EXPORT_API_VERSION,
  SanityExportError,
} from "./sanityExport";

const PROJECT_ID = "abc123";
const DATASET = "production";
const TOKEN = "test-token-xxx";

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchSanityExportStream", () => {
  it("requests the canonical export URL with bearer token", async () => {
    const ndjson = '{"_id":"a"}\n{"_id":"b"}\n';
    const response = new Response(ndjson, {
      status: 200,
      headers: { "content-type": "application/x-ndjson" },
    });
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchSanityExportStream({
      projectId: PROJECT_ID,
      dataset: DATASET,
      token: TOKEN,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [calledUrl, calledInit] = fetchMock.mock.calls[0];
    expect(calledUrl).toBe(
      `https://${PROJECT_ID}.api.sanity.io/${SANITY_EXPORT_API_VERSION}/data/export/${DATASET}`,
    );
    expect((calledInit as RequestInit).headers).toMatchObject({
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/x-ndjson",
    });
    expect(result.contentType).toBe("application/x-ndjson");
    expect(result.body).toBeInstanceOf(ReadableStream);
  });

  it("honours an explicit apiVersion override", async () => {
    const response = new Response("{}\n", { status: 200 });
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);

    await fetchSanityExportStream({
      projectId: PROJECT_ID,
      dataset: DATASET,
      token: TOKEN,
      apiVersion: "v2021-03-25",
    });

    expect(fetchMock.mock.calls[0][0]).toContain("/v2021-03-25/data/export/");
  });

  it("throws SanityExportError with status + body excerpt on non-2xx", async () => {
    const errorBody = "Unauthorized: token lacks dataset read permission";
    const response = new Response(errorBody, { status: 401 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    await expect(
      fetchSanityExportStream({ projectId: PROJECT_ID, dataset: DATASET, token: TOKEN }),
    ).rejects.toMatchObject({
      name: "SanityExportError",
      status: 401,
      bodyExcerpt: expect.stringContaining("Unauthorized"),
    });
  });

  it("truncates oversized error bodies to 500 chars", async () => {
    const oversize = "x".repeat(5000);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(oversize, { status: 500 })));

    try {
      await fetchSanityExportStream({ projectId: PROJECT_ID, dataset: DATASET, token: TOKEN });
      expect.fail("expected throw");
    } catch (error) {
      expect(error).toBeInstanceOf(SanityExportError);
      expect((error as SanityExportError).bodyExcerpt).toHaveLength(500);
    }
  });

  it("throws when the upstream returns 2xx with an empty body", async () => {
    const response = new Response(null, { status: 200 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    await expect(
      fetchSanityExportStream({ projectId: PROJECT_ID, dataset: DATASET, token: TOKEN }),
    ).rejects.toMatchObject({
      name: "SanityExportError",
      message: expect.stringContaining("no body"),
    });
  });
});
