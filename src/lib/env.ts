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
