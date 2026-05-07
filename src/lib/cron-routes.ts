/**
 * Maps wrangler cron schedule strings to the `/api/cron/*` paths the worker
 * dispatches when the corresponding scheduled event fires. Single source of
 * truth — both `custom-worker.ts` (runtime dispatch) and tests consume it.
 *
 * Keep keys in sync with the `triggers.crons` arrays in `wrangler.jsonc`
 * (top-level production block + `env.staging` block). A schedule listed in
 * wrangler but absent here = the scheduled event arrives and dispatches no
 * routes; not a runtime error, but the cron is dead.
 */
export const CRON_DISPATCH: Record<string, ReadonlyArray<string>> = {
  "0 */6 * * *": [
    "/api/cron/reconcile",
    "/api/cron/reconcile-mirror",
    "/api/cron/email-day-2",
    "/api/cron/email-day-7-deliver",
  ],
  "0 3 * * *": ["/api/cron/cleanup"],
  "0 10 * * *": ["/api/cron/email-day-7"],
  "0 12 * * 1": ["/api/cron/check-price-drift"],
} as const;

export function dispatchPathsForCron(cron: string): ReadonlyArray<string> {
  return CRON_DISPATCH[cron] ?? [];
}
