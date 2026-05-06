// Cloudflare Workers Sentry init lives in custom-worker.ts via Sentry.withSentry,
// which wraps every fetch and is the only entrypoint to the worker bundle in
// production. instrumentation.ts is reserved for the Next.js Node-runtime path
// (local `next dev`); intentionally left a no-op so dev sessions don't burn
// Sentry quota or pollute the issue tracker.

export function register(): void {
  // no-op
}
