// Sanity HTTP Export API → NDJSON stream. A Viewer-role token suffices —
// the secret name + scoping notes live in `wrangler.jsonc`.
// Pinned API version; bump here when adopting newer export features
// (Sanity API versions are opt-in stable).
export const SANITY_EXPORT_API_VERSION = "v2024-08-22";

export class SanityExportError extends Error {
  readonly status: number;
  readonly bodyExcerpt: string;

  constructor(status: number, bodyExcerpt: string, message?: string) {
    super(message ?? `Sanity export failed: HTTP ${status}`);
    this.name = "SanityExportError";
    this.status = status;
    this.bodyExcerpt = bodyExcerpt;
  }
}

interface FetchSanityExportArgs {
  projectId: string;
  dataset: string;
  token: string;
  apiVersion?: string;
}

interface FetchSanityExportResult {
  body: ReadableStream<Uint8Array>;
  contentType: string;
}

export async function fetchSanityExportStream(
  args: FetchSanityExportArgs,
): Promise<FetchSanityExportResult> {
  const apiVersion = args.apiVersion ?? SANITY_EXPORT_API_VERSION;
  const url = `https://${args.projectId}.api.sanity.io/${apiVersion}/data/export/${args.dataset}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${args.token}`,
      Accept: "application/x-ndjson",
    },
  });
  if (!response.ok) {
    const bodyExcerpt = await readBodyExcerpt(response);
    throw new SanityExportError(response.status, bodyExcerpt);
  }
  if (!response.body) {
    throw new SanityExportError(response.status, "", "Sanity export returned no body");
  }
  return {
    body: response.body,
    contentType: response.headers.get("content-type") ?? "application/x-ndjson",
  };
}

async function readBodyExcerpt(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 500);
  } catch {
    return "";
  }
}
