import { optionalEnv } from "@/lib/env";

/**
 * Runtime guard that the worker's R2 bucket binding agrees with the declared
 * `ENVIRONMENT`. Catches the misconfig where staging is deployed but the
 * R2 secrets still point at the production bucket (or vice versa) — which
 * would silently write customer photos to the wrong tier.
 *
 * Invoked at the top of booking-related route handlers (cheap; it's just two
 * env reads + a string check). The CI assertion in
 * scripts/assert-staging-bindings.mts is the deploy-time guard; this is the
 * runtime safety net for cases where the bindings drift after a manual
 * dashboard edit.
 *
 * No-op when `ENVIRONMENT` is undefined (local `next dev` without a wrangler
 * env block in scope).
 */

export type Environment = "production" | "staging";

export const STAGING_SUFFIX = "-staging";

export function assertEnvironmentBindings(): void {
  const environment = optionalEnv("ENVIRONMENT");
  const bucketName = optionalEnv("R2_BUCKET_NAME");

  if (!environment) return;
  if (!bucketName) return;

  const bucketIsStaging = bucketName.endsWith(STAGING_SUFFIX);

  if (environment === "staging" && !bucketIsStaging) {
    throw new Error(
      `ENVIRONMENT=staging but R2_BUCKET_NAME=${bucketName} does not end with ${STAGING_SUFFIX}`,
    );
  }

  if (environment === "production" && bucketIsStaging) {
    throw new Error(
      `ENVIRONMENT=production but R2_BUCKET_NAME=${bucketName} ends with ${STAGING_SUFFIX}`,
    );
  }
}
