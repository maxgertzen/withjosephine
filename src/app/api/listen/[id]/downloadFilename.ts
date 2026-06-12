type AssetKind = "voice-note" | "reading";

const FALLBACK_EXTENSION: Record<AssetKind, string> = {
  "voice-note": "mp3",
  reading: "pdf",
};

const ALLOWED_EXTENSIONS: Record<AssetKind, ReadonlySet<string>> = {
  "voice-note": new Set(["mp3", "m4a", "wav", "ogg", "aac", "opus"]),
  reading: new Set(["pdf"]),
};

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

// Sanitise a name fragment for use in a filename:
// - Strip chars that are quote/escape unsafe in header values: " and \
// - Replace remaining control chars with a space (preserves word breaks)
// - Collapse consecutive whitespace and trim
function sanitizeNamePart(value: string): string {
  return value
    .replace(/["\\]/g, "")
    .replace(/[\x00-\x1f\x7f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildListenFilename(input: {
  firstName?: string | null;
  lastName?: string | null;
  readingName?: string | null;
  readingSlug: string;
  submissionId: string;
  sourceUrl: string;
  kind: AssetKind;
}): string {
  const extension = extractAssetExtension(input.sourceUrl, input.kind);

  const first = input.firstName ? sanitizeNamePart(input.firstName) : "";
  const last = input.lastName ? sanitizeNamePart(input.lastName) : "";
  const reading = input.readingName ? sanitizeNamePart(input.readingName) : "";

  const parts = [first, last, reading].filter(Boolean);

  if (parts.length === 0) {
    const slug = input.readingSlug.trim() || "reading";
    return `${slug}.${extension}`;
  }

  return `${parts.join(" ")}.${extension}`;
}

// Chars that must not appear in the quoted ASCII fallback filename param.
const UNSAFE_FILENAME_CHARS = /["\r\n\\]/;

// Replace non-ASCII with "_" to produce a safe ASCII fallback for
// browsers that don't support the filename* RFC 6266 parameter.
function toAsciiFallback(value: string): string {
  return value.replace(/[^\x20-\x7e]/g, "_");
}

export function buildContentDisposition(input: {
  type: "inline" | "attachment";
  filename: string;
}): string {
  if (UNSAFE_FILENAME_CHARS.test(input.filename)) {
    throw new Error("buildContentDisposition: filename contains unsafe characters");
  }
  const ascii = toAsciiFallback(input.filename);
  const encoded = encodeURIComponent(input.filename);
  return `${input.type}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
