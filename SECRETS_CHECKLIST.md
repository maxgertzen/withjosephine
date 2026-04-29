# Secrets & Bindings — Booking Form Rebuild Phase 1

Operational checklist for everything that must be configured outside the codebase before PR1 → PR3 ship. Work top-to-bottom.

---

## Local install fix

A previous elevated install left `node_modules/.pnpm/` with root-owned packages, which breaks subsequent `pnpm install` runs. Restore ownership before installing:

```bash
sudo chown -R $USER:staff node_modules
pnpm install
```

If `node_modules` does not exist yet, `pnpm install` runs cleanly and this step is a no-op.

---

## Cloudflare Workers secrets

Set each via `pnpm exec wrangler secret put <NAME>` (prompts for the value) or in the Cloudflare dashboard at **Workers → withjosephine → Settings → Variables → Secrets**. Wrangler is a local devDep — bare `wrangler` works only if it is also installed globally; `pnpm exec wrangler` is the portable form, and `pnpm wrangler …` will not work because `wrangler` is not a package.json script.

| Env var | Description | Where to get it |
|---|---|---|
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the booking webhook endpoint | Stripe dashboard → Developers → Webhooks → endpoint → Signing secret |
| `STRIPE_SECRET_KEY` | Stripe API key (only used to call `webhooks.constructEvent`) | Stripe dashboard → Developers → API keys |
| `RESEND_API_KEY` | Resend API key with sending permission | Resend dashboard → API Keys → Create |
| `TURNSTILE_SECRET_KEY` | Server-side Turnstile secret for the booking + contact forms | Cloudflare dashboard → Turnstile → widget → Secret key |
| `R2_ACCOUNT_ID` | Cloudflare account ID that owns the R2 bucket | CF dashboard → R2 → Manage R2 API tokens, or account home page |
| `R2_ACCESS_KEY_ID` | R2 S3-API access key ID | CF dashboard → R2 → Manage R2 API tokens → Create |
| `R2_SECRET_ACCESS_KEY` | R2 S3-API secret access key | Same flow as access key — shown once at creation |
| `R2_BUCKET_NAME` | R2 bucket name | `withjosephine-booking-photos` |
| `NOTIFICATION_EMAIL` | Inbox that receives new-booking notifications | `hello@withjosephine.com` (or chosen alias) |
| `SANITY_WRITE_TOKEN` | Sanity API token with **Editor** (write) permission, used by `/api/booking` to create submission docs | Sanity manage → API → Tokens → **Add API token** → Editor |
| `CRON_SECRET` | Bearer token for manually triggering `/api/cron/*` (reconcile, cleanup, email-day-2, email-day-7, email-day-7-deliver). Cloudflare-triggered crons send `cf-cron` header and bypass this check; Bearer is for ad-hoc invocation. Generate with `openssl rand -hex 32`. | Generated locally |
| `LISTEN_TOKEN_SECRET` | HMAC-SHA256 secret used to sign `/listen/[token]` URLs in the Day +7 delivery email. Must be at least 32 bytes — generate with `openssl rand -hex 32`. Rotate by re-issuing tokens (no live tokens to invalidate before first delivery). | Generated locally |

Example:

```bash
pnpm exec wrangler secret put STRIPE_WEBHOOK_SECRET
pnpm exec wrangler secret put STRIPE_SECRET_KEY
pnpm exec wrangler secret put RESEND_API_KEY
pnpm exec wrangler secret put TURNSTILE_SECRET_KEY
pnpm exec wrangler secret put R2_ACCOUNT_ID
pnpm exec wrangler secret put R2_ACCESS_KEY_ID
pnpm exec wrangler secret put R2_SECRET_ACCESS_KEY
pnpm exec wrangler secret put R2_BUCKET_NAME
pnpm exec wrangler secret put NOTIFICATION_EMAIL
pnpm exec wrangler secret put SANITY_WRITE_TOKEN
pnpm exec wrangler secret put LISTEN_TOKEN_SECRET   # openssl rand -hex 32
```

`NEXT_PUBLIC_TURNSTILE_SITE_KEY` is a plain variable, not a secret — set it under **Variables → Variables** so it is inlined at build time.

---

## R2 bucket

1. CF dashboard → R2 → **Create bucket** → name `withjosephine-booking-photos`. Repeat for `withjosephine-booking-photos-preview` (used by `wrangler dev`).
2. Open the production bucket → **Settings → Public access → Custom Domains** → connect `images.withjosephine.com`. DNS is on Cloudflare so the CNAME provisions automatically.
3. **Lifecycle rules:** deferred. Object cleanup runs through the abandoned-submission cron in PR3 (which calls `deleteObject` from `src/lib/r2.ts`), so no automatic age-out rule is needed yet.
4. Create an R2 API token scoped to **Object Read & Write** for both buckets and copy the access key id + secret into the secrets above.

---

## Stripe

1. Confirm Payment Links are kept (no migration to Checkout Sessions — locked decision). For each of the three Payment Links (Soul Blueprint $179, Birth Chart $99, Akashic Record $79):
   - Stripe dashboard → **Payment Links** → open link → **After payment** → confirm **Collect customer email** is enabled.
2. Stripe dashboard → **Developers → Webhooks → Add endpoint**:
   - Endpoint URL: `https://withjosephine.com/api/stripe/webhook`
   - Events to send: `checkout.session.completed`, `checkout.session.expired`
   - Save, copy the **Signing secret** (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.
3. Copy the live secret key into `STRIPE_SECRET_KEY` (used only for `stripe.webhooks.constructEvent`).

---

## Turnstile

1. CF dashboard → [Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile) → **Add site**.
2. Hostnames: `withjosephine.com`, `localhost`.
3. Widget mode: Managed (recommended). Pre-clearance: off.
4. Copy the **Site key** into `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (plain var, not secret).
5. Copy the **Secret key** into `TURNSTILE_SECRET_KEY`.
6. PR2 will migrate `ContactForm` from hCaptcha to Turnstile using these same credentials.

---

## Resend

1. Resend dashboard → **Domains** → confirm `withjosephine.com` is verified (or add it and complete the SPF/DKIM/DMARC DNS records on Cloudflare DNS).
2. Confirm the sending subdomain `notifications@withjosephine.com` is permitted by the domain's verification (subdomains inherit verification from the apex).
3. Resend dashboard → **API Keys → Create API Key** with **Sending access** scoped to `withjosephine.com`. Copy into `RESEND_API_KEY`.
4. Send a test email from the Resend dashboard to confirm DNS is fully propagated before the first real submission.

---

## Local `.env.local` template

Copy into `.env.local` at the repo root and replace each placeholder. Never commit this file.

```env
# Stripe
STRIPE_SECRET_KEY=your-value-here
STRIPE_WEBHOOK_SECRET=your-value-here

# Resend
RESEND_API_KEY=your-value-here
NOTIFICATION_EMAIL=your-value-here

# Turnstile
TURNSTILE_SECRET_KEY=your-value-here
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-value-here

# Cloudflare R2
R2_ACCOUNT_ID=your-value-here
R2_ACCESS_KEY_ID=your-value-here
R2_SECRET_ACCESS_KEY=your-value-here
R2_BUCKET_NAME=your-value-here

# Sanity (already in use)
NEXT_PUBLIC_SANITY_PROJECT_ID=your-value-here
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_STUDIO_URL=http://localhost:3333
SANITY_WRITE_TOKEN=your-value-here

# Cron triggers
CRON_SECRET=your-value-here

# Web3Forms (server-side; replaces NEXT_PUBLIC_WEB3FORMS_KEY)
WEB3FORMS_KEY=your-value-here
```

---

## Verification commands

Run in this order from `www/` after every meaningful change. None of these should fail before opening a PR.

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```
