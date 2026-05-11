/**
 * Streams NDJSON line-by-line and collects asset references. Three ref
 * sources matter: `voiceNote.asset._ref`, `readingPdf.asset._ref`, and
 * `photoR2Key`. Each ref is deduplicated so a doc referenced by multiple
 * submissions doesn't trigger duplicate fetches downstream.
 */

export type AssetRef =
  | { kind: "sanityFile"; id: string } // matches Sanity asset _ref, e.g. "file-abc-mp3"
  | { kind: "r2Photo"; key: string }; // matches photoR2Key in submission doc

export interface ExtractAssetRefsResult {
  refs: AssetRef[];
  recordCount: number;
}

export async function extractAssetRefs(
  source: ReadableStream<Uint8Array>,
): Promise<ExtractAssetRefsResult> {
  const decoder = new TextDecoder();
  const reader = source.getReader();
  const dedup = new Map<string, AssetRef>();
  let pending = "";
  let recordCount = 0;

  const handleLine = (line: string) => {
    if (collectFromLine(line, dedup)) recordCount += 1;
  };

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (value) pending += decoder.decode(value, { stream: true });
      let newlineIdx = pending.indexOf("\n");
      while (newlineIdx !== -1) {
        const line = pending.slice(0, newlineIdx);
        pending = pending.slice(newlineIdx + 1);
        handleLine(line);
        newlineIdx = pending.indexOf("\n");
      }
      if (done) break;
    }
    pending += decoder.decode();
    if (pending.trim()) handleLine(pending);
  } finally {
    reader.releaseLock();
  }
  return { refs: Array.from(dedup.values()), recordCount };
}

/**
 * Returns true if the line was a valid record (counted in recordCount), false
 * if blank or malformed JSON.
 */
function collectFromLine(line: string, dedup: Map<string, AssetRef>): boolean {
  if (!line.trim()) return false;
  let doc: unknown;
  try {
    doc = JSON.parse(line);
  } catch {
    return false;
  }
  if (!doc || typeof doc !== "object") return false;
  const record = doc as Record<string, unknown>;

  const voiceRef = readNestedAssetRef(record, "voiceNote");
  if (voiceRef) addRef(dedup, { kind: "sanityFile", id: voiceRef });

  const pdfRef = readNestedAssetRef(record, "readingPdf");
  if (pdfRef) addRef(dedup, { kind: "sanityFile", id: pdfRef });

  const photoKey = record.photoR2Key;
  if (typeof photoKey === "string" && photoKey.length > 0) {
    addRef(dedup, { kind: "r2Photo", key: photoKey });
  }
  return true;
}

function readNestedAssetRef(record: Record<string, unknown>, field: string): string | null {
  const value = record[field];
  if (!value || typeof value !== "object") return null;
  const asset = (value as Record<string, unknown>).asset;
  if (!asset || typeof asset !== "object") return null;
  const ref = (asset as Record<string, unknown>)._ref;
  return typeof ref === "string" && ref.length > 0 ? ref : null;
}

function addRef(dedup: Map<string, AssetRef>, ref: AssetRef): void {
  const dedupKey = `${ref.kind}:${ref.kind === "sanityFile" ? ref.id : ref.key}`;
  if (!dedup.has(dedupKey)) dedup.set(dedupKey, ref);
}
