# Staging Environment Runbook

Provisioning + verification checklist for `staging.withjosephine.com` (and any future non-production environment provisioned the same way — e.g. `dev.*`).

The PR-S series (PRs #58–#65, 2026-05-06) shipped the staging tier. This doc captures the provisioning steps as a repeatable checklist, including the gotchas surfaced 2026-05-07 during the CSP nonce branch's smoke.

---

## What "staging tier" means

A non-production environment that mirrors production's stack but isolates writes. Concretely, every prod stateful resource has a staging twin:

| Resource | Production | Staging | Provisioned by |
|---|---|---|---|
| Sanity dataset | `production` | `staging` | Sanity dashboard |
| D1 database | `withjosephine-bookings` | `withjosephine-bookings-staging` | `wrangler d1 create` |
| R2 bucket | `withjosephine-booking-photos` | `withjosephine-booking-photos-staging` | `wrangler r2 bucket create` |
| Worker | `withjosephine` | `withjosephine-staging` | `wrangler.jsonc` `env.staging` |
| GH Environment | `production` | `staging` | GH repo Settings → Environments |
| Custom Domain | `withjosephine.com` | `staging.withjosephine.com` | CF Custom Domain on the staging worker |
| Stripe | live mode | test mode | Stripe dashboard |
| Resend | live | `RESEND_DRY_RUN=1` (no actual sends) | Worker var |

---

## Provisioning checklist (when standing up a new non-prod environment)

A new environment isn't done until **every** item below is checked. Skipping any one of them produces a half-broken environment that may render fine on top-of-funnel pages while silently failing on deeper pages — see "Why this matters" below for the 2026-05-07 incident.

### 1. Sanity dataset

- [ ] **Create the dataset** — Sanity dashboard → Project → API → Datasets → Create. Or `sanity dataset create <name>`.
- [ ] **Set visibility.** New datasets default to **Private**. Choose:
  - **Public** (matches `production`): the underlying CDN serves published-perspective queries unauthenticated, which is what `next-sanity`'s `defineLive` relies on for customer-facing render paths. Easiest, lowest setup cost. Anyone with the project ID can query published content — but the URL itself is gated by Cloudflare Access for non-prod environments, so practical exposure is small.
  - **Private**: more secure but requires a code change. The base `sanityClient` in `src/lib/sanity/client.ts` must attach `SANITY_READ_TOKEN` server-side AND switch to `useCdn:false` (Sanity tokens disable CDN). `defineLive`'s `serverToken` alone is insufficient — it only authenticates the *drafts* perspective (verified at `node_modules/next-sanity/dist/live.js:49`). Customer queries run published-perspective and would still go unauthenticated without the base-client change.
  - **Default decision for non-prod environments:** Public, matching production's posture. CF Access on the URL provides the access boundary.

### 2. D1 database

- [ ] `pnpm wrangler d1 create withjosephine-bookings-<env>` — capture the database ID returned.
- [ ] Update `wrangler.jsonc` → `env.<name>.d1_databases[0].database_id` with the new ID.
- [ ] Apply schema migrations: `pnpm wrangler d1 migrations apply withjosephine-bookings-<env> --env <name> --remote`.

### 3. R2 bucket

- [ ] `pnpm wrangler r2 bucket create withjosephine-booking-photos-<env>`.

- [ ] **Expand R2 API token bucket access** to include the new bucket. CF Dashboard → R2 → Manage R2 API Tokens → find the worker's S3-API token → Edit → Bucket access → either "Apply to all buckets" OR add `withjosephine-booking-photos-<env>` to the specific-buckets list. **This is the step that bit us 2026-05-08** — the staging bucket was created with correct CORS, but the existing R2 API token (used by both prod and staging workers) was scoped to the prod bucket only. PUTs against the staging bucket returned `403 AccessDenied` with no CORS headers, and the browser surfaced this as a misleading "No 'Access-Control-Allow-Origin' header is present" error. Cleaner long-term: create a separate token per env (defense in depth), then `pnpm wrangler secret put R2_ACCESS_KEY_ID --env <name>` + `R2_SECRET_ACCESS_KEY` with the new pair.

- [ ] **CF Dashboard → R2 → `withjosephine-booking-photos-<env>` → Settings → CORS Policy → Edit.** Paste this JSON (replace `<env>`):

  ```json
  [
    {
      "AllowedOrigins": ["https://<env>.withjosephine.com", "http://localhost:3000"],
      "AllowedMethods": ["GET", "PUT", "HEAD"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
  ```

  Wildcard `AllowedHeaders` matches the production policy and covers `Content-Type` + `Content-Length` (which the upload path's signed PUT sends).

- [ ] **Verify before declaring step done — script-based, not dashboard-toast-based.** Run a write probe with the worker's actual access key against the new bucket. Quick inline: load `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` from `.env.local` (or the worker's secret values), use `aws4fetch` to sign a 60-second PUT URL against `<bucket>/_probe/test.txt`, fetch it. Expect HTTP 200. If 403 with `<Code>AccessDenied</Code>` → token scope is wrong. If 403 with `<Code>InvalidAccessKeyId</Code>` → wrong key entirely. If 403 with `<Code>SignatureDoesNotMatch</Code>` → secret value or clock skew. Then attempt a real upload from `https://<env>.withjosephine.com/book/soul-blueprint/intake` end-to-end before declaring done.

- [ ] Bind in `wrangler.jsonc` → `env.<name>.r2_buckets[0]`.

### 4. Worker secrets (CRITICAL — this is the step that bit us 2026-05-07)

Every secret production has must also exist on the staging worker. Compare the lists:

```sh
pnpm wrangler secret list                # production
pnpm wrangler secret list --env staging  # staging
```

The diff should be **zero** (or one — staging may legitimately omit `STRIPE_*` if test mode + dry-run, but Sanity / Resend / R2 / D1 / Sentry / cron / listen-token / Turnstile keys must all be present). 2026-05-07 incident: `SANITY_READ_TOKEN` was missing on the staging worker. Even after we set it, the Public-vs-Private dataset mismatch was still the real culprit — but the secret-list diff would have surfaced the gap regardless.

- [ ] `pnpm wrangler secret list --env <name>` matches `pnpm wrangler secret list` (modulo intentional differences documented per-secret).

### 5. GitHub Environment vars

- [ ] GH repo Settings → Environments → create `<name>` if missing.
- [ ] Set `NEXT_PUBLIC_SANITY_DATASET=<name>` (build-time inlined by Next).
- [ ] Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` to the env's Turnstile key.
- [ ] Set `NEXT_PUBLIC_R2_PUBLIC_HOST` to the env's R2 image host.
- [ ] Set `NEXT_PUBLIC_UNDER_CONSTRUCTION=0` (prod is `1` while parked).
- [ ] Set `NEXT_PUBLIC_TRACK_NON_PROD=1` (or 0 — opt-in for analytics on non-prod).

Verify: `gh variable list --env <name>` returns the expected set.

### 6. Custom Domain

- [ ] CF dashboard → Workers → `withjosephine-<name>` → Custom Domains → add `<name>.withjosephine.com`. Or declare in `wrangler.jsonc` `env.<name>.routes`.
- [ ] CF Zero Trust → Access → Applications → add the hostname under the existing Access policy (so CF Access gates it).

### 7. CI deploy gate

- [ ] `.github/workflows/ci.yml` `deploy-staging` job's `if:` clause includes `github.ref == 'refs/heads/main'` (or whatever branch is the env's source). Don't add per-feature-branch entries permanently — that's a temp-PR-only pattern (see this PR's `feat/csp-nonce-and-audits` history for the temp-then-revert dance).

### 8. Sanity webhook for content sync

- [ ] Sanity dashboard → API → Webhooks → create webhook to `https://<name>.withjosephine.com/api/sanity-sync`.
- [ ] HMAC secret matches the worker's `SANITY_WEBHOOK_SECRET`.
- [ ] Filter to relevant doc types if cross-dataset sync is desired.

---

## Verification protocol

After provisioning, **before declaring the environment ready**, smoke-test the deepest page in the highest-traffic flow — not just the entry. Static fallbacks on entry/letter/landing pages mask data-layer outages until you hit a page without fallbacks.

The current canonical smoke is the booking flow:

1. Open `https://<env>.withjosephine.com/` in browser → landing renders.
2. Click "Book a Reading" or a reading card → `/book/<slug>` entry page renders.
3. Click "Book this Reading" → `/book/<slug>/letter` renders.
4. Click "Tell me about you" → **`/book/<slug>/intake` renders the intake form** ← This is the load-bearing assertion. The intake page hard-fails with `notFound()` if either `fetchReading` or `fetchBookingForm` returns null. Earlier pages have static fallbacks.
5. (Optional) Click through to Stripe sandbox → confirm `/thank-you/<slug>` redirect.

If the intake page 404s while earlier pages render, the dataset is unreachable from the deployed worker. Likely causes (in order): dataset visibility, worker secrets, or a Sanity API outage.

---

## Why this matters — 2026-05-07 incident

`staging.withjosephine.com/book/soul-blueprint/intake` returned 404 for ~24h after the staging tier shipped. Root cause: the Sanity `staging` dataset was Private (default), and the codebase's `sanityClient` is `useCdn:true` with no token. Customer-facing queries went unauthenticated → CDN returned `null` → intake's `notFound()` fired.

The bug was masked because:

- The booking entry page (`/book/<slug>`) has a static fallback (`getReadingById` from `src/data/readings.generated.ts`) → it rendered fine even though `fetchReading` returned null.
- The letter page (`/book/<slug>/letter`) uses `?? ENTRY_PAGE_DEFAULTS` for all bookingForm fields → also rendered fine.
- Only the intake page hard-failed.

Fix was a one-toggle dashboard change: flip the `staging` dataset visibility from Private → Public. Zero code change, zero deploy.

**Lessons (saved in PAI memory as `feedback_sanity_client_token.md` and `feedback_static_fallbacks_can_mask_outages.md`):**

1. `defineLive`'s `serverToken` only authenticates *drafts* perspective. Don't rely on it for customer-facing reads.
2. Always smoke the deepest page in a flow when verifying a deploy. Top-of-funnel pages with static fallbacks lie.

---

## Related docs

- [`SANITY_DATASETS.md`](./SANITY_DATASETS.md) — data flow + re-seeding playbook (separate concern from provisioning)
- [`PHASE10_CLOUDFLARE_SETUP.md`](./PHASE10_CLOUDFLARE_SETUP.md) — initial CF Workers setup
- [`POST_LAUNCH_BACKLOG.md`](./POST_LAUNCH_BACKLOG.md) — deferred work
