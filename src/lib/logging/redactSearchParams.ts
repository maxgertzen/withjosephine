const RELATIVE_URL_SENTINEL = "https://redact.local";

export const SENSITIVE_QUERY_PARAMS = ["t"] as const;

/** Mutates `params` in place. Returns true if any redaction was applied. */
function redactInParams(
  params: URLSearchParams,
  paramsToRedact: readonly string[],
): boolean {
  let touched = false;
  for (const param of paramsToRedact) {
    if (params.has(param)) {
      const occurrences = params.getAll(param).length;
      params.delete(param);
      for (let i = 0; i < occurrences; i++) {
        params.append(param, "[REDACTED]");
      }
      touched = true;
    }
  }
  return touched;
}

/**
 * Browsers don't transmit `#fragment` to servers, but Sentry's browser SDK
 * and other client-side breadcrumbs capture the full URL. Client-side flows
 * that land tokens in the hash need the same redaction as the query string.
 */
function redactFragmentParams(
  hash: string,
  paramsToRedact: readonly string[],
): string {
  if (!hash || hash === "#") return hash;
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!paramsToRedact.some((p) => raw.includes(`${p}=`))) return hash;
  const params = new URLSearchParams(raw);
  return redactInParams(params, paramsToRedact) ? `#${params.toString()}` : hash;
}

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

  let touched = redactInParams(parsed.searchParams, paramsToRedact);

  if (parsed.hash) {
    const rebuilt = redactFragmentParams(parsed.hash, paramsToRedact);
    if (rebuilt !== parsed.hash) {
      parsed.hash = rebuilt;
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
