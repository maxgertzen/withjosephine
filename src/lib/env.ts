export type EnvVar =
  | "ADMIN_API_KEY"
  | "BREVO_API_KEY"
  | "CRON_SECRET"
  | "ENVIRONMENT"
  | "MIXPANEL_SERVICE_ACCOUNT_SECRET"
  | "MIXPANEL_SERVICE_ACCOUNT_USERNAME"
  | "R2_ACCESS_KEY_ID"
  | "R2_ACCOUNT_ID"
  | "R2_BUCKET_NAME"
  | "R2_SECRET_ACCESS_KEY"
  | "SANITY_BACKUP_WEBHOOK_SECRET"
  | "SANITY_EXPORT_TOKEN"
  | "SANITY_WEBHOOK_SECRET"
  | "SANITY_WRITE_TOKEN"
  | "STRIPE_SECRET_KEY"
  | "STRIPE_WEBHOOK_SECRET";

export function requireEnv(name: EnvVar) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function optionalEnv(name: EnvVar, missingWarning?: string) {
  const value = process.env[name];
  if (!value) {
    if (missingWarning) console.warn(`[env] ${name} not set — ${missingWarning}`);
    return null;
  }
  return value;
}

export type FeatureFlag =
  | "RESEND_DRY_RUN"
  | "SANITY_BACKUP_ENABLED"
  | "NEXT_PUBLIC_UNDER_CONSTRUCTION";

/**
 * Project convention for boolean env flags: "1" or "true" → on, anything else
 * → off. Read at call-time so tests can override via vi.stubEnv between cases.
 */
export function isFlagEnabled(name: FeatureFlag) {
  const value = process.env[name];
  return value === "1" || value === "true";
}
