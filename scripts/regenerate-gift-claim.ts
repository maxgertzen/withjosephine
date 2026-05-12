#!/usr/bin/env tsx
/**
 * Admin CLI: regenerate a gift claim link.
 *
 * Hits POST /api/internal/gift-claim-regenerate which issues a fresh token,
 * invalidates the prior URL, and re-emails the first_send claim variant to
 * the correct party (recipient for `scheduled`, purchaser for `self_send`).
 *
 * USAGE
 *   SITE_ORIGIN=https://withjosephine.com \
 *   DO_DISPATCH_SECRET=… \
 *   pnpm exec tsx scripts/regenerate-gift-claim.ts <submissionId>
 *
 * Reads SITE_ORIGIN + DO_DISPATCH_SECRET from env. Use the staging URL for
 * staging rows. Outputs the redacted target email + Resend dispatch status.
 */

async function main(): Promise<void> {
  const submissionId = process.argv[2];
  if (!submissionId) {
    console.error("Usage: regenerate-gift-claim.ts <submissionId>");
    process.exit(2);
  }

  const origin = process.env.SITE_ORIGIN;
  const secret = process.env.DO_DISPATCH_SECRET;
  if (!origin) {
    console.error("Missing SITE_ORIGIN env (e.g. https://withjosephine.com)");
    process.exit(2);
  }
  if (!secret) {
    console.error("Missing DO_DISPATCH_SECRET env (paste the worker secret)");
    process.exit(2);
  }

  const res = await fetch(`${origin}/api/internal/gift-claim-regenerate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-do-secret": secret,
    },
    body: JSON.stringify({ submissionId }),
  });

  const body = await res.text();
  if (!res.ok) {
    console.error(`[regenerate-gift-claim] HTTP ${res.status} — ${body}`);
    process.exit(1);
  }

  console.log(`[regenerate-gift-claim] ${res.status} — ${body}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
