/**
 * Extract a non-empty string field from a parsed JSON body. Returns null when
 * the body isn't an object, the field is missing, or the field isn't a
 * non-empty string. Callers should respond with their refusal shape on null.
 */
export function parseStringField(body: unknown, key: string): string | null {
  if (!body || typeof body !== "object") return null;
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}
