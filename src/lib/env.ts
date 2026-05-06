export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function optionalEnv(name: string, missingWarning?: string): string | null {
  const value = process.env[name];
  if (!value) {
    if (missingWarning) console.warn(`[env] ${name} not set — ${missingWarning}`);
    return null;
  }
  return value;
}

/**
 * Project convention for boolean env flags: "1" or "true" → on, anything else
 * → off. Read at call-time so tests can override via vi.stubEnv between cases.
 */
export function isFlagEnabled(name: string): boolean {
  const value = process.env[name];
  return value === "1" || value === "true";
}
