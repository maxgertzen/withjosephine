export type TokenVars = Record<string, string | number | null | undefined>;

function normalize(vars: TokenVars): Array<readonly [string, string]> {
  const out: Array<readonly [string, string]> = [];
  for (const [key, raw] of Object.entries(vars)) {
    out.push([`{${key}}`, raw == null ? "" : String(raw)] as const);
  }
  return out;
}

function replaceTokens(value: string, pairs: Array<readonly [string, string]>): string {
  if (!value.includes("{")) return value;
  let out = value;
  for (const [needle, replacement] of pairs) {
    out = out.replaceAll(needle, replacement);
  }
  return out;
}

function walk<T>(value: T, pairs: Array<readonly [string, string]>): T {
  if (typeof value === "string") {
    return replaceTokens(value, pairs) as T;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => walk(entry, pairs)) as T;
  }
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      out[key] = walk(entry, pairs);
    }
    return out as T;
  }
  return value;
}

export function applyTokens<T>(value: T, vars: TokenVars): T {
  return walk(value, normalize(vars));
}
