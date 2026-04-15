# Phase 10 — Deploy Foundation Runbook

> **Status:** active, supersedes prior dashboard-auto-deploy draft.
> **Architecture decisions** (Council + Max, 2026-04-15):
> 1. **Cloudflare Workers** via `@opennextjs/cloudflare` (NOT Pages)
> 2. **GitHub Actions** with `wrangler-action` (NOT CF dashboard auto-deploy)
> 3. **Pre-launch:** apex `withjosephine.com` stays dark; only `preview.withjosephine.com` is bound to the Worker
> 4. **Sanity Studio** preview URL = `https://preview.withjosephine.com` once live (workers.dev URL as interim)

---

## The three environments

| Env | Where it runs | URL | Audience | Sanity dataset |
|---|---|---|---|---|
| **Local dev** | Your laptop | `http://localhost:3000` | Max coding; Josephine occasionally via `pnpm studio:dev` | `production` |
| **Preview** | Cloudflare Worker | `https://preview.withjosephine.com` | Josephine in Studio Presentation | `production` |
| **Production** | Same Cloudflare Worker | `https://withjosephine.com` (LAUNCH ONLY) | Public visitors | `production` |

**One Worker, one Cloudflare project, one Sanity dataset.** The draft cookie (`__prerender_bypass`) is host-scoped — drafts on `preview` cannot leak to apex.

**Pre-launch state:** `withjosephine.com` apex is **NOT bound**. The Worker is reachable via `*.workers.dev` URL and `preview.withjosephine.com` only. Apex serves whatever Hostinger parks on it (or nothing, depending on DNS).

---

## Environment variables

### Local files (gitignored)

**`www/.env.local`** — used by `pnpm dev` and `pnpm cf:build`:
```
NEXT_PUBLIC_SANITY_PROJECT_ID=…
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_STUDIO_URL=…  # https://withjosephine.sanity.studio (or http://localhost:3333 locally)
SANITY_READ_TOKEN=…              # Viewer-role token from Sanity Manage
SANITY_WRITE_TOKEN=…             # only for seed scripts; never shipped
NEXT_PUBLIC_WEB3FORMS_KEY=…
SANITY_STUDIO_PROJECT_ID=…       # for scripts that call studio CLI
SANITY_STUDIO_DATASET=production
```

> Draft-mode validation is now handled by `next-sanity`'s `defineEnableDraftMode` — it authenticates each Studio session against Sanity's API using `SANITY_READ_TOKEN`. A separately-shared `SANITY_PREVIEW_SECRET` is **no longer required** anywhere.

**`www/studio/.env`** — used by `pnpm studio:dev` and `pnpm studio:deploy`:
```
SANITY_STUDIO_PROJECT_ID=…
SANITY_STUDIO_DATASET=production
SANITY_STUDIO_PREVIEW_URL=…      # see two-mode switch below
```

**Two-mode `SANITY_STUDIO_PREVIEW_URL`** (baked into Studio bundle at deploy time):
- Local Studio dev: `http://localhost:3000` → run `pnpm studio:dev`
- Deployed Studio (interim, before preview subdomain is live): `https://<your-project>.<your-account>.workers.dev`
- Deployed Studio (after preview subdomain is live): `https://preview.withjosephine.com`
- At launch: `https://withjosephine.com`

Each change requires `pnpm studio:deploy` to take effect.

### GitHub Actions secrets / variables

Set in: GitHub repo → Settings → Secrets and variables → Actions.

**Variables (plain text):**
| Name | Value |
|---|---|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | from Sanity Manage |
| `NEXT_PUBLIC_SANITY_DATASET` | `production` |
| `NEXT_PUBLIC_SANITY_STUDIO_URL` | `https://withjosephine.sanity.studio` (or hosted Studio URL) |

**Secrets:**
| Name | Source |
|---|---|
| `NEXT_PUBLIC_WEB3FORMS_KEY` | Web3Forms dashboard |
| `CLOUDFLARE_API_TOKEN` | CF dashboard → My Profile → API Tokens → `Edit Cloudflare Workers` template |
| `CLOUDFLARE_ACCOUNT_ID` | CF dashboard sidebar (right side, account ID copy button) |

> The Worker's *runtime* secret (`SANITY_READ_TOKEN`) is NOT a GitHub secret — it lives in CF dashboard env vars (next section). The CI only needs the build-time public env vars + Cloudflare credentials.

### Cloudflare Worker runtime env vars

Set in: CF dashboard → Workers & Pages → `withjosephine` → Settings → Variables and Secrets.

| Name | Type | Source |
|---|---|---|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Plain text | from Sanity Manage |
| `NEXT_PUBLIC_SANITY_DATASET` | Plain text | `production` |
| `NEXT_PUBLIC_SANITY_STUDIO_URL` | Plain text | `https://withjosephine.sanity.studio` |
| `NEXT_PUBLIC_WEB3FORMS_KEY` | Plain text | Web3Forms dashboard |
| `SANITY_READ_TOKEN` | **Secret** | Sanity Manage → API → Tokens → create with **Viewer** role |

**Do NOT set:**
- `SANITY_PREVIEW_SECRET` — obsolete since the migration to `defineEnableDraftMode` (validation now uses `SANITY_READ_TOKEN` against Sanity's API).
- `SANITY_WRITE_TOKEN` — only for seed scripts running locally; never on the Worker.
- `SANITY_STUDIO_*` — Studio doesn't run on the Worker.

---

## One-time Cloudflare account setup

### 1. Create the Worker (one-time)

Two options — pick one:

**Option A — from your laptop (recommended for first deploy):**
```bash
cd www
# Authenticates and creates the Worker if it doesn't exist.
pnpm cf:build && pnpm dlx wrangler deploy
```
Note the assigned URL: `https://withjosephine.<your-account>.workers.dev`

**Option B — from CF dashboard:**
Workers & Pages → Create → Create Worker → name `withjosephine` → deploy a "Hello World", then GHA will overwrite on next push to `main`.

### 2. Add Worker env vars / secrets

CF dashboard → `withjosephine` Worker → Settings → Variables and Secrets. Add the rows from the runtime table above.

### 3. Create GitHub Actions secrets

Per the GitHub Actions table above. Without these, `wrangler-action` fails with `Authentication error`.

### 4. Verify automated deploy

Push a trivial commit to `main` → watch GitHub Actions → confirm `deploy` job runs after the gates → confirm new build is live at `*.workers.dev` URL.

### 5. Allow Worker URL in Sanity CORS Origins (one-time per host)

Visual Editing's live subscription opens an authenticated request from the browser back to the Sanity Content Lake. The Studio iframe is served from a different origin than the Worker, so Sanity has to whitelist the Worker URL or the browser blocks the request and live preview never connects.

For each host that the Studio's Presentation tool will iframe:

```bash
# From www/ (uses your Sanity CLI auth)
pnpm dlx sanity cors add https://withjosephine.<acct>.workers.dev --credentials
pnpm dlx sanity cors add https://preview.withjosephine.com         --credentials
pnpm dlx sanity cors add https://withjosephine.com                 --credentials   # at launch only
pnpm dlx sanity cors add http://localhost:3000                      --credentials   # local dev
```

`--credentials` is required — without it the browser drops the auth header and live preview falls back to silent failure.

Verify in `manage.sanity.io` → API → CORS Origins. All four entries should show **Credentials: Allow**.

---

## Sanity Studio — interim preview wiring (before custom domain)

Until `preview.withjosephine.com` is live, point Studio at the workers.dev URL:

```bash
# studio/.env
SANITY_STUDIO_PREVIEW_URL=https://withjosephine.<your-account>.workers.dev

# Then:
cd www
pnpm studio:deploy
```

Open `https://withjosephine.sanity.studio` → click any document with a Presentation location (e.g. landing page) → Studio iframes the workers.dev URL.

> **Why interim?** Workers.dev URLs are unprofessional but functional. Once the preview subdomain is live (next section), swap and redeploy.

---

## Custom domain wiring (DNS migration — pre-launch only adds preview subdomain)

> **Critical:** DNS migration is high-risk because of `hello@withjosephine.com` Email Routing.
> Read every step before doing anything.

### Step 1 — Inventory current DNS at Hostinger

Log into Hostinger DNS panel for `withjosephine.com` and screenshot the full record list. Pay special attention to:
- **MX records** (these route inbound mail — losing them = email outage)
- **TXT records** (SPF, DMARC, DKIM, domain verification)
- **A / AAAA / CNAME** records (anything Hostinger has set up by default)
- **NS records** (current nameservers, e.g. `ns1.dns-parking.com`)

Save the screenshot to `docs/DNS_INVENTORY_<date>.png` (gitignored).

### Step 2 — Add the zone in Cloudflare

CF dashboard → Add a Domain → enter `withjosephine.com` → choose **Free** plan.

CF will scan the existing DNS and import what it can find. **Verify every imported record matches your screenshot.** Add anything missing manually. Critical to get right:
- All MX records (priority + target) for inbound mail
- SPF TXT record (`v=spf1 include:_spf.mx.cloudflare.net ~all` — see Email Routing step)
- Any TXT verification records for Sanity / Web3Forms / etc.

**Do NOT add an A or AAAA record for the apex `@`.** That's what keeps the apex dark pre-launch. (CF will offer to add a default — say no.)

### Step 3 — Configure Cloudflare Email Routing for `hello@withjosephine.com`

CF dashboard → your zone (`withjosephine.com`) → Email → Email Routing.

1. Click **Get started** → CF prompts to add the required DNS records (MX × 3 + SPF TXT). Approve — these REPLACE Hostinger's MX setup once nameservers cut over.
2. **Destination addresses** tab → Add `<your-personal-gmail>@gmail.com` → CF emails Gmail a verification link → click it.
3. **Routing rules** tab → Create address → `hello@withjosephine.com` → Action: send to → `<your-personal-gmail>@gmail.com`. Save.
4. (Optional but recommended) Catch-all: `*@withjosephine.com` → send to same Gmail. Or → drop. Saves you from missed-typo-into-spam scenarios.
5. **Important — DMARC:** Add a TXT record manually:
   - Name: `_dmarc`
   - Value: `v=DMARC1; p=none; rua=mailto:<your-personal-gmail>@gmail.com`
   - Start with `p=none` (monitor only). Tighten to `p=quarantine` after a week of clean reports.

> **Verify before nameserver cutover:** CF Email Routing UI shows ✅ for each required DNS record. If anything is ❌, fix BEFORE step 4. If you cut over with broken email config, inbound mail bounces.

### Step 4 — Cut over nameservers from Hostinger to Cloudflare

1. CF dashboard → Overview → copy the two assigned nameservers (e.g. `xena.ns.cloudflare.com`, `tom.ns.cloudflare.com`).
2. Hostinger → Domains → `withjosephine.com` → DNS / Nameservers → Custom → paste both → save.
3. Wait. Propagation is usually 5–60min, can take up to 24h.
4. Verify: `dig +short NS withjosephine.com` should return the CF nameservers.
5. Verify Email Routing: send a test email from your phone to `hello@withjosephine.com` → confirm it arrives in Gmail. **Do this within 1h of cutover.**
6. CF dashboard → zone overview → status flips to **Active**.

### Step 5 — Bind `preview.withjosephine.com` to the Worker

CF dashboard → Workers & Pages → `withjosephine` → Settings → Domains & Routes → Add → Custom domain → `preview.withjosephine.com` → save.

CF auto-creates the proxied CNAME under the hood (orange cloud). Wait until status shows ✅ Active (~30s).

### Step 6 — Repoint Sanity Studio at the new URL

```bash
# studio/.env
SANITY_STUDIO_PREVIEW_URL=https://preview.withjosephine.com

cd www
pnpm studio:deploy
```

Open `https://withjosephine.sanity.studio` → Presentation → confirm iframe loads `preview.withjosephine.com` (not workers.dev anymore).

---

## Verification checklist (pre-launch)

```bash
# 1. Worker is live on workers.dev
curl -sI https://withjosephine.<acct>.workers.dev | head -5
# expected: HTTP/2 200, content-security-policy: …frame-ancestors 'none'

# 2. Worker is also live on the preview subdomain
curl -sI https://preview.withjosephine.com | head -5
# expected: HTTP/2 200

# 3. Apex still dark
curl -sI https://withjosephine.com | head -5
# expected: connection refused / Hostinger parking page / NXDOMAIN — anything but the new site

# 4. Draft enable rejects unauthenticated requests
curl -sI https://preview.withjosephine.com/api/draft/enable
# expected: HTTP/2 401 (no `sanity-preview-secret` from a real Studio session)

# 5. Draft response: noindex + uncached + relaxed CSP (bypass cookie set manually)
curl -sI -b "__prerender_bypass=test" https://preview.withjosephine.com/ | grep -iE "x-robots-tag|cache-control|content-security-policy"
# expected:
#   cache-control: private, no-store, max-age=0
#   x-robots-tag: noindex, nofollow
#   content-security-policy: …frame-ancestors 'self' https://*.sanity.studio https://*.sanity.io…

# 6. End-to-end draft mode (must use Studio Presentation — `defineEnableDraftMode`
# verifies the session against Sanity's API, so a curl-only path no longer works).

# 7. Email routing
# Send a test email from your phone to hello@withjosephine.com
# expected: arrives in Gmail within 1 minute

# 8. Sanity Presentation
# Open https://withjosephine.sanity.studio → click landingPage in structure
# Click "Open preview" → iframe loads preview.withjosephine.com showing drafts
```

---

## Local dev workflow

```bash
# Terminal 1 — site
cd www
pnpm dev
# → http://localhost:3000

# Terminal 2 — studio (with studio/.env SANITY_STUDIO_PREVIEW_URL=http://localhost:3000)
pnpm studio:dev
# → http://localhost:3333
# Click Presentation tab → iframes localhost:3000 → see drafts live
```

> Switch `studio/.env` SANITY_STUDIO_PREVIEW_URL between `http://localhost:3000` (local) and the deployed URL (preview.withjosephine.com), redeploy with `pnpm studio:deploy` when working with the hosted Studio.

---

## Launch-day cutover (apex goes live)

When ready to launch:

1. CF dashboard → Workers & Pages → `withjosephine` → Domains & Routes → Add → Custom domain → `withjosephine.com` (apex). Save. Wait for ✅.
2. CF dashboard → DNS → confirm CF auto-added the proxied A/AAAA records for the apex. Orange cloud must be on.
3. (Optional, recommended) Add `www.withjosephine.com` as a custom domain too → CF auto-creates a redirect to apex.
4. Update `studio/.env` SANITY_STUDIO_PREVIEW_URL to `https://withjosephine.com` → `pnpm studio:deploy`.
5. Verify: `curl -sI https://withjosephine.com/` → 200, CSP strict, `x-robots-tag` absent (this one IS public).
6. Verify Sanity Presentation iframes apex now.
7. (Optional) Decide what to do with `preview.withjosephine.com`: leave it bound (nice for staging), or remove it from Worker domains and rely on apex. Keeping it bound is fine — the CSP middleware handles both hosts identically.

---

## Anything you might be missing

1. **Hostinger keeps holding the registration**, even after nameservers move to CF — that's fine. Renewals happen at Hostinger; DNS happens at CF.
2. **CORS Origins** — every host the Studio iframes must be in Sanity's CORS allowlist with `--credentials`. Missing entry → live preview silently fails to subscribe (no error in the iframe, just no updates).
3. **`SANITY_WRITE_TOKEN` on the Worker** — must NOT be set. Double-check.
4. **Old `out/` build artifacts** — `next.config.ts` no longer sets `output: "export"`. If you find any old script referencing `out/`, it's stale.
5. **The previous Pages project at `withjosephine.pages.dev`** — once GHA is deploying the Worker successfully, decide: delete the old Pages project (cleanest) or leave it unlinked. It's currently the only "production" deploy, so DON'T delete until the Worker is verified live AND you're comfortable with workers.dev URL as the de-facto pre-launch URL.
6. **CF zone Free plan limits** — 100k requests/day on the Worker free tier; well above pre-launch traffic.

---

## Rotation

**`SANITY_READ_TOKEN`:** new token in Sanity Manage → update CF Worker secret → re-deploy (push trivial commit) → revoke old.

**`CLOUDFLARE_API_TOKEN`:** rotate yearly. Generate new in CF dashboard → update GitHub secret → revoke old token → push trivial commit to verify.

Log rotations in `docs/SECRETS_ROTATION_LOG.md`.
