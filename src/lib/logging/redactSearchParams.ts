const RELATIVE_URL_SENTINEL = "https://redact.local";

export const SENSITIVE_QUERY_PARAMS = ["t", "sessionId", "submissionId"] as const;

const LISTEN_PATH = /\/listen\/[^/?#]+/;
const GIFT_CODE_PATH = /\/gift\/(?!send(?:[/?#]|$))[^/?#]+/;
const GIFT_PATH_WITH_FRAGMENT = /(\/gift\/[^#]*)#.*$/;

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

const SENSITIVE_PARAM_PRESENT = new RegExp(
  `[?&#](?:${SENSITIVE_QUERY_PARAMS.join("|")})(?:[=&#]|$)`,
);

const SENSITIVE_REQUEST_HEADERS = new Set(["cookie", "authorization", "referer", "cf-cron"]);

export function redactSensitiveUrl(url: string): string {
  const pathRedacted = url
    .replace(LISTEN_PATH, "/listen/[REDACTED]")
    .replace(GIFT_CODE_PATH, "/gift/[REDACTED]")
    .replace(GIFT_PATH_WITH_FRAGMENT, "$1#[REDACTED]");
  if (!SENSITIVE_PARAM_PRESENT.test(pathRedacted)) return pathRedacted;
  return redactSearchParams(pathRedacted, SENSITIVE_QUERY_PARAMS);
}

type SentryRequestData = {
  headers?: unknown;
  url?: string;
  query_string?: unknown;
  data?: unknown;
};

export function scrubSentryRequest(request: SentryRequestData | undefined): void {
  if (!request) return;
  if (request.headers && typeof request.headers === "object") {
    const headers = request.headers as Record<string, unknown>;
    for (const name of Object.keys(headers)) {
      if (SENSITIVE_REQUEST_HEADERS.has(name.toLowerCase())) delete headers[name];
    }
  }
  if (request.url) {
    request.url = redactSensitiveUrl(request.url);
  }
  if (typeof request.query_string === "string") {
    const redacted = redactSensitiveUrl(`/?${request.query_string}`);
    request.query_string = redacted.slice(redacted.indexOf("?") + 1);
  } else {
    delete request.query_string;
  }
  delete request.data;
}

const BREADCRUMB_URL_KEYS = ["url", "from", "to"] as const;

export function scrubBreadcrumb<T extends { data?: Record<string, unknown> }>(breadcrumb: T): T {
  const data = breadcrumb.data;
  if (!data) return breadcrumb;
  for (const key of BREADCRUMB_URL_KEYS) {
    const value = data[key];
    if (typeof value === "string") {
      data[key] = redactSensitiveUrl(value);
    }
  }
  return breadcrumb;
}
