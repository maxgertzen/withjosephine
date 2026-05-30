type AssetKind = "voice-note" | "reading";

const FALLBACK_EXTENSION: Record<AssetKind, string> = {
  "voice-note": "mp3",
  reading: "pdf",
};

const ALLOWED_EXTENSIONS: Record<AssetKind, ReadonlySet<string>> = {
  "voice-note": new Set(["mp3", "m4a", "wav", "ogg", "aac", "opus"]),
  reading: new Set(["pdf"]),
};

const SLUG_SAFE = /^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$/i;

export function extractAssetExtension(sourceUrl: string, kind: AssetKind): string {
  try {
    const pathname = new URL(sourceUrl).pathname;
    const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
    const candidate = match?.[1]?.toLowerCase() ?? "";
    if (candidate && ALLOWED_EXTENSIONS[kind].has(candidate)) return candidate;
  } catch {
    // fall through
  }
  return FALLBACK_EXTENSION[kind];
}

function sanitizeSlugPart(value: string, fallback: string): string {
  return SLUG_SAFE.test(value) ? value : fallback;
}

export function buildListenFilename(input: {
  readingSlug: string;
  submissionId: string;
  sourceUrl: string;
  kind: AssetKind;
}): string {
  const slug = sanitizeSlugPart(input.readingSlug, "reading");
  const id = sanitizeSlugPart(input.submissionId, "reading");
  const extension = extractAssetExtension(input.sourceUrl, input.kind);
  return `${slug}-${input.kind}-${id}.${extension}`;
}

const UNSAFE_FILENAME_CHARS = /["\r\n\\]/;

export function buildContentDisposition(input: {
  type: "inline" | "attachment";
  filename: string;
}): string {
  if (UNSAFE_FILENAME_CHARS.test(input.filename)) {
    throw new Error("buildContentDisposition: filename contains unsafe characters");
  }
  return `${input.type}; filename="${input.filename}"`;
}
