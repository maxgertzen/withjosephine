// Sentry server-side instrumentation disabled while we sit on the 3 MiB
// Cloudflare Workers free-tier limit. @sentry/nextjs was bloating the
// worker bundle from ~11 MiB to ~16 MiB. Re-enable as a Phase 1.5 task
// once we either (a) move to the paid plan, or (b) switch to the
// lighter @sentry/cloudflare integration which targets workerd directly.
// See POST_LAUNCH_BACKLOG.md.

export function register(): void {
  // no-op
}
