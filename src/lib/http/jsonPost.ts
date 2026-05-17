/**
 * Tiny JSON POST helper for client-side mutation calls.
 *
 * Collapses the 5-line `fetch + headers + body + try/catch + 422/429 branching`
 * pattern that every `/my-gifts` action used. Returns a discriminated payload
 * so callers can branch on `status`/`fieldErrors`/`topError` without re-parsing
 * `Response`.
 *
 * - On 2xx: `{ ok: true, status, data }`
 * - On 422: `{ ok: false, status, fieldErrors }`
 * - On 429: `{ ok: false, status, topError: "rate-limited" }`
 * - On other non-2xx: `{ ok: false, status, topError: ... }`
 * - On network/parse error: `{ ok: false, status: 0, topError: "network" }`
 *
 * The helper never throws. Callers should treat `topError`/`fieldErrors` as
 * presentation hooks — UI copy strings live in the Sanity-editable layer,
 * not here.
 *
 * Does NOT cover `/api/booking/gift` — that route's validation-failure
 * response ships `fieldErrors` as an object (`{recipientEmail: "msg"}`)
 * rather than the array shape `[{field, message}]` this helper extracts,
 * and its 422 means anti-abuse-cap rather than field validation. Use raw
 * fetch + the route-specific response shape there.
 */
export type JsonPostResult<T> = {
  ok: boolean;
  status: number;
  data?: T;
  fieldErrors?: Record<string, string>;
  topError?: string;
};

export async function jsonPost<T = unknown>(
  url: string,
  body?: unknown,
): Promise<JsonPostResult<T>> {
  let res: Response;
  try {
    const init: RequestInit = { method: "POST" };
    if (body !== undefined) {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(body);
    }
    res = await fetch(url, init);
  } catch {
    return { ok: false, status: 0, topError: "network" };
  }

  if (res.status === 422) {
    const json = (await res.json().catch(() => null)) as {
      fieldErrors?: Array<{ field: string; message: string }>;
    } | null;
    const errs: Record<string, string> = {};
    for (const e of json?.fieldErrors ?? []) errs[e.field] = e.message;
    return { ok: false, status: 422, fieldErrors: errs };
  }

  if (res.status === 429) {
    return { ok: false, status: 429, topError: "rate_limited" };
  }

  if (!res.ok) {
    return { ok: false, status: res.status, topError: `http_${res.status}` };
  }

  const data = (await res.json().catch(() => undefined)) as T | undefined;
  return { ok: true, status: res.status, data };
}
