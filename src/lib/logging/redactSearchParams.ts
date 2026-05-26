const RELATIVE_URL_SENTINEL = "https://redact.local";

/**
 * Returns a sanitized URL string with the specified query parameters
 * replaced by "[REDACTED]" for safe logging. Used to keep one-tap listen
 * tokens out of Sentry breadcrumbs and any explicit console.log of request
 * URLs. (Pentester section 2.2 mitigation.)
 *
 * Handles relative URLs by parsing against a sentinel base then stripping
 * it on the way out. Malformed URLs return unchanged (defensive: never
 * throw from a logging helper).
 */
export function redactSearchParams(
  url: string,
  paramsToRedact: readonly string[],
): string {
  if (paramsToRedact.length === 0) return url;

  const isRelative = !/^[a-z][a-z0-9+\-.]*:/i.test(url);

  let parsed: URL;
  try {
    parsed = isRelative ? new URL(url, RELATIVE_URL_SENTINEL) : new URL(url);
  } catch {
    return url;
  }

  let touched = false;
  for (const param of paramsToRedact) {
    if (parsed.searchParams.has(param)) {
      const occurrences = parsed.searchParams.getAll(param).length;
      parsed.searchParams.delete(param);
      for (let i = 0; i < occurrences; i++) {
        parsed.searchParams.append(param, "[REDACTED]");
      }
      touched = true;
    }
  }

  if (!touched) return url;

  const out = parsed.toString();
  if (isRelative) {
    return out.startsWith(RELATIVE_URL_SENTINEL)
      ? out.slice(RELATIVE_URL_SENTINEL.length)
      : out;
  }
  return out;
}
