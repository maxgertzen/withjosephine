# Sanity → R2 Backup Provisioning Runbook

End-to-end provisioning steps to take the Sanity-dataset backup system from "code-shipped-gated-off" to "fully running". The code paths (`/api/cron/backup-sanity-dataset` + `/api/sanity-backup-webhook`) are already on `feat/listen-redesign-and-gifting`; everything in this doc is dashboard + `wrangler` work Max owns.

Companion docs:

- [`BACKLOG.md`](../BACKLOG.md) — Phase 3 + Phase 3.5 backlog entries (source of the spec).
- [`STAGING_RUNBOOK.md`](./STAGING_RUNBOOK.md) — format reference for "do staging first, verify, then prod".

---

## Order of operations

Hard rule: **finish all of staging before touching prod.** Each step must be performed for both environments before moving to the next, because the verification protocol depends on a green staging run to gain confidence in the production sequence.

1. [R2 buckets](#1-r2-buckets)
2. [Lifecycle rules](#2-lifecycle-rules)
3. [Bucket Locks](#3-bucket-locks)
4. [Encryption](#4-encryption-nothing-to-do)
5. [Sanity Viewer tokens](#5-sanity-viewer-tokens)
6. [Worker secrets](#6-worker-secrets)
7. [Worker public env var](#7-worker-public-env-var-sanity_backup_enabled)
8. [Sanity webhooks](#8-sanity-webhooks)
9. [Flip the flag + verify](#9-flip-the-flag--verify)
10. [Rollback path](#10-rollback-path)

When to flip `SANITY_BACKUP_ENABLED=1`:

| Env | Timing |
| --- | --- |
| Staging | Right after staging steps 1–8 are done. Run step 9 against staging. Do not proceed to prod provisioning until staging verifies green. |
| Production | After staging is green AND prod steps 1–8 are done. Flip BEFORE apex unpark — you want the webhook mirror live the instant real customer voice notes start landing. |

---

## 1. R2 buckets

Same CF account as `withjosephine-booking-photos`.

CF Dashboard → R2 → Create bucket:

| Env | Bucket name |
| --- | --- |
| Production | `josephine-backups` |
| Staging | `josephine-backups-staging` |

Settings → Public access → leave **off** (these are private — Worker binds via account-level access).

`wrangler` equivalent (if you want to script it instead of the dashboard):

```sh
pnpm exec wrangler r2 bucket create josephine-backups
pnpm exec wrangler r2 bucket create josephine-backups-staging
```

Verify in CF Dashboard → R2: both buckets appear in the list.

---

## 2. Lifecycle rules

Per bucket: bucket → Settings → Object Lifecycle Rules → Add.

Two rules per bucket:

| Rule name | Prefix | Action |
| --- | --- | --- |
| `90 Days Cleanup` | `backups/weekly` | Delete uploaded objects after 90 Days |
| `1095 Days Cleanup` | `backups/monthly` | Delete uploaded objects after 1095 Days |

Both enabled. The weekly cron writes to `backups/weekly/<YYYY-Www>/dataset.ndjson` and `backups/weekly/<YYYY-Www>/assets/...`; the monthly path is reserved for future monthly snapshot work.

The webhook mirror writes to `backups/live/<assetId>`. **This prefix is NOT covered by either lifecycle rule** — `backups/live/` mirrors stay until manually pruned. That is intentional: it is the only live-RPO defense; aging it out would defeat the purpose. Revisit if storage cost ever becomes a concern.

---

## 3. Bucket Locks

Per bucket: bucket → Settings → Bucket Lock Rules → Add.

| Rule name | Prefix | Retention period |
| --- | --- | --- |
| `locking-90-days` | `backups/weekly` | 90 Days |
| `locking-1095-days` | `backups/monthly` | 1095 Days |

Both enabled.

**Honest note on the lock model (verified 2026-05-13).** The CF Bucket Lock dialog does NOT expose a Compliance-vs-Governance mode toggle. Per the [R2 bucket-locks docs](https://developers.cloudflare.com/r2/buckets/bucket-locks/), lock rules can be removed via Dashboard / Wrangler / API by anyone with an R2 admin token. R2 also does not implement S3 Object Lock — `PutObjectLockConfiguration` is listed as Unimplemented in the [R2 S3 API compatibility table](https://developers.cloudflare.com/r2/api/s3/api/). This means an attacker with a sufficiently privileged R2 API token can remove the lock and then delete objects.

The defense against that threat is **API-token scope minimization**, tracked separately in [`BACKLOG.md`](../BACKLOG.md) → "R2 API token scoping for backup buckets". Not launch-blocking; the locks still prevent the accidental-deletion path which is the dominant practical threat.

---

## 4. Encryption — nothing to do

R2 buckets are encrypted at rest with AES-256-GCM under CF-managed keys automatically. Per the [R2 data security docs](https://developers.cloudflare.com/r2/reference/data-security/): *"Encryption and decryption are automatic, do not require user configuration to enable."* There is no per-bucket Encryption panel in the dashboard and no BYOK / customer-managed-key option.

Skip this step. The earlier draft of the backlog had a step about "create a distinct KMS key" — that was wrong; R2 does not support this.

---

## 5. Sanity Viewer tokens

Per dataset: manage.sanity.io → Project (Josephine Soul Readings) → API → Tokens → Add API token.

| Env | Token name | Permissions | Dataset |
| --- | --- | --- | --- |
| Production | `worker-backup-export-prod` | **Viewer** (read-only) | `production` |
| Staging | `worker-backup-export-staging` | **Viewer** (read-only) | `staging` |

Copy each token value to a password manager immediately — Sanity only shows it once.

---

## 6. Worker secrets

Two secrets per worker. Run from the repo root (the directory with `wrangler.jsonc`).

### 6a. `SANITY_EXPORT_TOKEN`

The Sanity Viewer token from step 5, used by the weekly cron to call the Sanity export endpoint.

```sh
# Staging — paste the worker-backup-export-staging value when prompted
pnpm exec wrangler secret put SANITY_EXPORT_TOKEN --env staging

# Production — paste the worker-backup-export-prod value when prompted
pnpm exec wrangler secret put SANITY_EXPORT_TOKEN
```

### 6b. `SANITY_BACKUP_WEBHOOK_SECRET`

Shared HMAC secret between the Sanity webhook config and the `/api/sanity-backup-webhook` Worker route. Different value per environment.

Generate one value per env:

```sh
# Run TWICE — once for staging, once for prod, capture each into your password manager
openssl rand -hex 32
```

Then put them on the workers:

```sh
# Staging
pnpm exec wrangler secret put SANITY_BACKUP_WEBHOOK_SECRET --env staging

# Production
pnpm exec wrangler secret put SANITY_BACKUP_WEBHOOK_SECRET
```

Verify the secrets landed:

```sh
pnpm exec wrangler secret list --env staging | grep -E 'SANITY_(EXPORT_TOKEN|BACKUP_WEBHOOK_SECRET)'
pnpm exec wrangler secret list                | grep -E 'SANITY_(EXPORT_TOKEN|BACKUP_WEBHOOK_SECRET)'
```

Both should print both keys (names only; values are not displayed — they're write-only).

---

## 7. Worker public env var: `SANITY_BACKUP_ENABLED`

**Important — set declaratively in `wrangler.jsonc`, NOT via the CF dashboard.** Surfaced 2026-05-13: `wrangler deploy` replaces all worker Variables with what's listed in `wrangler.jsonc env.<name>.vars` (or top-level `vars` for prod). Dashboard-set vars that aren't in the file get stripped on the next push, silently flipping the flag back to off.

### Staging — declarative (already shipped on `feat/listen-redesign-and-gifting` + downstream)

Already in `wrangler.jsonc` → `env.staging.vars`:

```jsonc
"vars": {
  "BOOKING_DB_DRIVER": "d1",
  "ENVIRONMENT": "staging",
  "RESEND_DRY_RUN": "1",
  "SANITY_BACKUP_ENABLED": "1"
}
```

New non-prod environments should mirror this. Add the line; commit; push; CI deploys; cron picks up the flag on next fire.

### Production — staged, gated by §9b cleanup

For the production-first-flip moment (Max-action, blocked by §9b pre-prod data cleanup):

1. Add `SANITY_BACKUP_ENABLED: "1"` to `wrangler.jsonc` top-level `vars`:
   ```jsonc
   "vars": {
     "BOOKING_DB_DRIVER": "d1",
     "ENVIRONMENT": "production",
     "SANITY_BACKUP_ENABLED": "1"
   }
   ```
2. Commit + merge to `main`. The deploy-production job picks it up. First weekly cron after the merge writes a (clean, per §9b) NDJSON snapshot.

Don't add this pre-cleanup. The 90-day Bucket Lock on `backups/weekly/` makes the first NDJSON stick whether you wanted it to or not.

### Why not dashboard

`wrangler deploy` overwrites the Variables panel on every push. Dashboard is fine for short-lived debug ("does this flag matter for this curl?"), but for persistence it loses to wrangler.jsonc on the next deploy.

---

## 8. Sanity webhooks

manage.sanity.io → Project → API → GROQ-powered webhooks → Add webhook.

### 8a. Staging webhook

| Field | Value |
| --- | --- |
| Name | `Staging submission backup mirror` |
| URL | `https://staging.withjosephine.com/api/sanity-backup-webhook` |
| Dataset | `staging` |
| Trigger on | Create + Update (skip Delete) |
| Filter | `_type == "submission"` |
| Projection | `{ _id, _type, voiceNote, readingPdf }` |
| HTTP method | `POST` |
| Secret | the `SANITY_BACKUP_WEBHOOK_SECRET` value used on the **staging** worker |
| Enable | ON |

### 8b. Production webhook

| Field | Value |
| --- | --- |
| Name | `Production submission backup mirror` |
| URL | `https://withjosephine.com/api/sanity-backup-webhook` |
| Dataset | `production` |
| Trigger on | Create + Update (skip Delete) |
| Filter | `_type == "submission"` |
| Projection | `{ _id, _type, voiceNote, readingPdf }` |
| HTTP method | `POST` |
| Secret | the `SANITY_BACKUP_WEBHOOK_SECRET` value used on the **production** worker |
| Enable | ON only after step 9 verifies staging |

---

## 9. Flip the flag + verify

### 9a. Staging verification

Two paths to exercise: weekly cron + live webhook. Both need CF Access plumbing on staging because the entire origin is fronted by Cloudflare Access. The same plumbing is documented separately in [`STAGING_RUNBOOK.md`](./STAGING_RUNBOOK.md) → "CF Access patterns for ops curls and webhooks" — read it once, the patterns below are the recipe.

#### Pre-flight A — CF Access **service token** for the cron curl

Sanity webhooks can't send custom headers, but operator curls can. The cron route is curl-only; a service token is the right primitive.

1. CF Dashboard → **Zero Trust** → **Access** → **Service Auth** → **Service Tokens** → **Create Service Token**.
   - Name: `staging-ops-cron-trigger`.
   - Duration: 1 year.
2. Copy the **Client ID + Client Secret** immediately (Secret shown once).
3. CF Dashboard → **Zero Trust** → **Access** → **Applications** → the Application that fronts `staging.withjosephine.com` → **Policies** → **Add a new policy**:
   - **Action: Service Auth** (NOT Allow — that's for human identity-provider login).
   - Include → Selector: **Service Token** → pick the new token.
   - Save; ~30s to propagate.
4. Add to `.env.staging` (gitignored):
   ```
   CF_ACCESS_CLIENT_ID=<id>
   CF_ACCESS_CLIENT_SECRET=<secret>
   ```

#### Pre-flight B — CF Access **Bypass** policy for the Sanity webhook path

Sanity's outbound webhook POSTs land at `https://staging.withjosephine.com/api/sanity-backup-webhook`. Sanity has no field for adding CF Access headers — every delivery would 302 to login. Solution: a path-specific Bypass policy. The webhook is already secured by HMAC signature (see `route.ts:113` `verifySignedRequest` + Phase 3.5 pentester gate) so Access is redundant for this path.

1. CF Dashboard → **Zero Trust** → **Access** → **Applications** → **Add an application** → **Self-hosted**.
2. Configure:
   - **Application name:** `staging-sanity-backup-webhook-bypass`.
   - **Application Domain:**
     - Subdomain: `staging`, Domain: `withjosephine.com`.
     - **Path: `api/sanity-backup-webhook`** (no leading slash; CF Access adds it).
3. **Policies** → **Add a policy:**
   - **Policy name:** `Bypass — HMAC handles auth`.
   - **Action: Bypass** (not Allow, not Service Auth).
   - Include → *Everyone*.
4. Save. ~30s propagation. CF Access evaluates Applications by path-specificity, so the new app overrides the broad `/*` Access app for this exact path only.

#### Cron path (manual trigger)

Set `SANITY_BACKUP_ENABLED=1` on the staging worker (step 7), then:

```sh
cd /Users/maxgertzen/dev/projects/josephine-soul-readings/www
set -a && source .env.staging && set +a

curl -i \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID" \
  -H "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET" \
  https://staging.withjosephine.com/api/cron/backup-sanity-dataset
```

Expected: HTTP 200, JSON body with `success: true`, non-zero `ndjsonBytes`, an `assetCount` field. `partial: true` is allowed if `assetCount > 0` and some asset refs in Sanity are dangling (orphan photoR2Keys etc.); the cron flags them via `assetFailures` rather than crashing, and the failures are Sentry-captured.

**One run per period — by-design.** After the first successful run in a given week, `backups/weekly/<YYYY-Www>/dataset.ndjson` is covered by the 90-day Bucket Lock and cannot be overwritten. A second curl in the same week returns `HTTP 500 — completeMultipartUpload: The object is locked by the bucket policy.` That's the lock working as intended (predicted in the Phase 3 Pentester LOW-3 deferral). Manual verification is therefore single-shot per period. The scheduled cron only fires Mon 03:00 UTC, so production scheduled runs never collide.

Confirm the NDJSON actually landed (note: `wrangler r2 object list` is NOT a real subcommand — wrangler v4 only exposes `r2 object get/put/delete`; use `bucket info` for object-count signal and `object get --remote` for specific keys):

```sh
# Object-count sanity check (laggy ~1 min, but quick signal)
pnpm exec wrangler r2 bucket info josephine-backups-staging | grep -E 'object_count|bucket_size'

# Pull the specific NDJSON we just wrote. <YYYY-Www> matches periodLabel from the cron response above.
pnpm exec wrangler r2 object get \
  "josephine-backups-staging/backups/weekly/<YYYY-Www>/dataset.ndjson" \
  --remote --file /tmp/dataset-staging.ndjson
wc -c /tmp/dataset-staging.ndjson    # byte count should match `ndjsonBytes` in the cron response
```

`--remote` is non-optional. Without it, wrangler reads a local Miniflare bucket that's empty — you'll get a misleading "key does not exist".

#### Webhook path

1. Open Sanity Studio against the staging dataset.
2. Open any `submission` doc (or create a draft), **attach a small voice note + reading PDF**, click **Publish**. Saving a draft alone won't fire the webhook by default — the step-8 config has "Include drafts: OFF" deliberately, so publishing is the trigger.
3. Wait ~5–10 seconds.

Find the asset `_ref`s the publish generated (Sanity content-addresses by SHA, so each upload produces a unique `_ref`):

```sh
cd /Users/maxgertzen/dev/projects/josephine-soul-readings/www
# Quick GROQ query for the latest submission with a voiceNote.
# Uses SANITY_READ_TOKEN from .env.staging (Viewer-scope is enough).
set -a && source .env.staging && set +a
node -e '
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const token = process.env.SANITY_READ_TOKEN ?? process.env.SANITY_EXPORT_TOKEN;
const q = encodeURIComponent(`*[_type=="submission" && defined(voiceNote.asset._ref)] | order(_updatedAt desc)[0]{_id, _updatedAt, "voiceRef": voiceNote.asset._ref, "pdfRef": readingPdf.asset._ref}`);
fetch(`https://${projectId}.api.sanity.io/v2024-01-01/data/query/${dataset}?query=${q}`, {headers:{Authorization:`Bearer ${token}`}})
  .then(r=>r.json()).then(j=>console.log(JSON.stringify(j.result, null, 2)));
'
```

Then verify R2 has both:

```sh
pnpm exec wrangler r2 object get \
  "josephine-backups-staging/backups/live/<voiceRef>" \
  --remote --file /tmp/live-voice.bin
pnpm exec wrangler r2 object get \
  "josephine-backups-staging/backups/live/<pdfRef>" \
  --remote --file /tmp/live-pdf.bin
file /tmp/live-voice.bin /tmp/live-pdf.bin   # expect WAVE/mp3 audio + PDF document
```

Sanity-side delivery health: manage.sanity.io → API → Webhooks → click the staging webhook → recent deliveries. Latest should be **200**. `302` means CF Access intercepted (Bypass policy missing or path doesn't match). `401` means HMAC mismatch (secret in Sanity ≠ secret on worker). `5xx` means real failure — check Sentry.

#### Sentry health check

After we restored Sentry via the typo fix (`SENTRY_DNS` → `SENTRY_DSN` 2026-05-13), the cron and webhook now capture failures. After a green run, the Sentry project should show:
- Zero captures from `/api/cron/backup-sanity-dataset` (cron stage tags) AND `/api/sanity-backup-webhook` (route stage tags) for the last 15 minutes IF `assetFailures` was 0.
- N captures matching `assetFailures` count IF some asset refs were dangling. That's by-design; verify the captures shape (`tags: { cron, stage }` + `extra: { backupId, ref }`).

If all three are green, move to 9b.

### 9b. Production-readiness gate — pre-launch data cleanup (CRITICAL, Bucket-Lock-driven ordering)

This step does NOT exist on staging. It is a hard precondition before flipping `SANITY_BACKUP_ENABLED=1` on production.

**Why it matters.** R2 Bucket Locks on `backups/weekly/` and `backups/monthly/` are **immutable for 90 / 1095 days**. Once the production cron fires for the first time, whatever is in the production Sanity dataset + the production photos R2 bucket gets snapshotted into a locked-retention path and **cannot be deleted until the lock expires**. If test bookings, smoke-test residue, or pre-launch QA data are still present, they're stuck in the backup for 90 days — minimum.

`backups/live/` is NOT locked. Webhook-mirrored assets land there and remain deletable, so live mirror is not load-bearing on cleanup timing. The risk is exclusively about the weekly cron.

**Sequence — DO NOT FLIP `SANITY_BACKUP_ENABLED=1` UNTIL ALL OF THESE ARE DONE:**

1. Run "Pre-prod data cleanup" per [`BACKLOG.md`](../BACKLOG.md) → UX → "Pre-prod data cleanup":
   - Production Sanity: delete all test-bookings, residue from smoke runs, and any documents created during pre-launch QA.
   - Production D1: SQL-delete any test rows under `bookings` and orphan rows in dependent tables.
   - Production photos R2 bucket (`withjosephine-booking-photos`): purge anything that's not real customer data.
2. Verify cleanup by sampling production Sanity (`*[_type == "submission"] | order(_createdAt desc)[0..5]`) and D1 (`SELECT id, email, created_at FROM bookings ORDER BY created_at DESC LIMIT 10`). Expect zero test entries.
3. ONLY THEN proceed to 9c.

If you accidentally flip the flag before cleanup, the choices are bad:
- Live with the locked test data in `backups/weekly/<YYYY-Www>/` for up to 90 days, OR
- Recreate the entire production bucket (loses any retention guarantees + breaks the Worker binding mid-stream).

Prevention is the cheap path.

### 9c. Production rollout

Only after 9a passes AND 9b precondition is satisfied:

1. Verify all step-1 through step-8 are mirrored to production (separate Sanity Viewer token; `SANITY_EXPORT_TOKEN` + `SANITY_BACKUP_WEBHOOK_SECRET` on the prod worker via `wrangler secret put` without `--env`; `NEXT_PUBLIC_SANITY_PROJECT_ID` + `NEXT_PUBLIC_SANITY_DATASET` Variables on the prod worker; Sanity webhook 8b enabled).
2. **Confirm whether production is fronted by CF Access.** Today it isn't — only staging is. If that ever changes, repeat the 9a Pre-flight A + B (service token + bypass policy) for the production hostname.
3. Set `SANITY_BACKUP_ENABLED=1` on the production worker (CF Dashboard → Workers → `withjosephine` → Settings → Variables).
4. `curl` the production cron endpoint with `Authorization: Bearer <prod CRON_SECRET>`. If production is NOT behind Access, no service-token headers needed.
5. Verify NDJSON via `wrangler r2 object get --remote josephine-backups/backups/weekly/<YYYY-Www>/dataset.ndjson`.
6. Trigger the production webhook by attaching a tiny test asset to a real (or seeded) submission in production Sanity Studio, then deleting that test asset post-verify.
7. Verify `backups/live/<assetId>` populated.
8. Production webhook (step 8b) should be Enabled-OFF until step 4 verifies green; enable AFTER cron passes.

---

## 10. Rollback path

If anything goes wrong post-flip and you need to disable backups fast:

**Fastest kill (no deploy, no commit) — disable the Sanity webhook:** manage.sanity.io → API → Webhooks → click the webhook for the affected env → toggle off. Stops the live mirror immediately. Cron still fires on its weekly schedule but the live RPO bleeding stops.

**Disable the cron (requires deploy):** because the flag is declared in `wrangler.jsonc`, flipping it via dashboard is a one-deploy-and-back-on round-trip. Real rollback:

```sh
# Flip SANITY_BACKUP_ENABLED to "0" in wrangler.jsonc env.staging.vars (or top-level for prod)
git checkout -b chore/disable-backup-flag
# edit wrangler.jsonc → "SANITY_BACKUP_ENABLED": "0"
git commit -am 'chore(backup): disable SANITY_BACKUP_ENABLED for <reason>'
git push
# CI deploys; cron route now returns { skipped: true, reason: "flag_off" }; webhook returns 204
```

Setting `SANITY_BACKUP_ENABLED=0`:
- Stops the weekly cron from running its backup logic (the route returns early with `{ skipped: true }`).
- The webhook route returns `204 No Content` without doing anything.

To re-enable: flip the value back to `"1"` in `wrangler.jsonc` and redeploy.

---

## Known behaviours (read once, save the next operator an hour)

### Re-upload preserves history — by design, not a leak

Sanity content-addresses every asset (`file-<sha256>-<ext>`). If a customer or Becky re-uploads a different file to the same `voiceNote` / `readingPdf` field, the doc's `asset._ref` switches to a new `_ref`. The old `_ref` becomes unreferenced from the submission but **still exists in Sanity's CDN**, and R2's `backups/live/<old-ref>` **stays** — `mirrorAssets` HEAD-before-PUTs by key, never deletes.

This is the safety net behaviour. Two implications:

- **`backups/live/` grows monotonically.** Storage cost is negligible at this volume ($0.015/GB/mo R2), but useful to know. The weekly cron's `backups/weekly/<*>/assets/` only carries currently-referenced assets, so the "what was true on Monday at 03:00 UTC" snapshot stays clean.
- **GDPR Art. 17 erasure must clear ALL historical refs.** When a deletion request comes in: walk the historical NDJSON snapshots to find every `_ref` ever associated with the customer's `_id`, then delete from `backups/live/` (free) and document the 90-day-locked `backups/weekly/<*>/assets/` retention in the privacy policy.

### Asset failures are by-design recoverable, not a backup failure

The cron uses `Promise.allSettled` per `uploadAssets` (`route.ts:166`). One missing R2 photo (e.g. an orphan `photoR2Key` from a cleaned-up booking) does NOT crash the run — it counts in `assetFailures`, captures to Sentry, and the cron returns `partial: true`. `partial: true` is operator signal, not failure signal.

### `backups/live/` is intentionally NOT lifecycle-managed

Section 2 of this runbook configures lifecycle rules only on `backups/weekly/` (90d) and `backups/monthly/` (1095d). `backups/live/` is left out because aging it out would defeat the RPO-in-seconds promise it exists to deliver. Storage cost re-evaluation: revisit when sustained monthly volume crosses ~50 GB in this prefix (current trajectory is <1 GB/year).

---

## Known follow-ups

These are not blockers for first-flip, but they are on the queue:

- **R2 API token scoping for backup buckets** — see [`BACKLOG.md`](../BACKLOG.md) → Security → "R2 API token scoping for backup buckets". Real defense against retention-shortening attacks.
- **Annual restore drill** — separate session, scoped in the Phase 4 compliance runbook. The backup is only as good as your ability to restore from it.
- **Phase 3 backup cron pentester deferrals** — MED-2 / LOW-3 / LOW-4 in `BACKLOG.md` under "Phase 3 backup cron — security follow-ups". Triggers documented per item.
- **Phase 3.5 webhook backup pentester deferrals** — LOW-1 / LOW-2 in `BACKLOG.md` under "Phase 3.5 webhook backup — security follow-ups".
