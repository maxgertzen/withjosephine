# Apex Unpark Runbook

Standalone, self-contained procedure to take `withjosephine.com` from **parked**
(holding page) to **live**. Written to survive context resets: every var, its
current value, and every step is here. Verify each value at run time (this file
is a snapshot; treat live GitHub / Cloudflare / Stripe as source of truth).

Last verified: 2026-07-05 (against GitHub variables + `wrangler.jsonc`).

## Current state (parked)

| What | Value now | Where |
|---|---|---|
| `NEXT_PUBLIC_UNDER_CONSTRUCTION` | `1` (parked) | repo variable **and** `production` environment variable **and** prod worker secret of the same name |
| `APEX_UNPARKED` | unset (prod smoke skips) | `production` environment variable |
| `NEXT_INC_CACHE_R2_BUCKET` | present | `wrangler.jsonc` top-level (prod) + `env.staging` |
| `WORKER_SELF_REFERENCE` | present | `wrangler.jsonc` top-level (prod) + `env.staging` |
| Stripe | **test mode** | prod worker `STRIPE_*` secrets + prod Sanity `stripePaymentLink` URLs (`buy.stripe.com/test_…`) |
| `main` vs `release/v1.16.0` | `main` is behind; live work is on `release/v1.16.0` (parked, staging-green) | git |

`NEXT_PUBLIC_UNDER_CONSTRUCTION` is inlined at build time (NEXT_PUBLIC) **and**
read at runtime as a worker secret — that is why it must be flipped in all three
locations. Missing one leaves the apex parked or half-parked.

## Preconditions before unparking

1. `release/v1.16.0` merged to `main` and the `deploy-production` gate approved
   (main is the only branch that deploys prod). The worker deploys **still
   parked** (`UNDER_CONSTRUCTION=1`) so there is zero customer exposure until the
   unpark flip.
2. Post-merge smoke passed on the deployed (still-parked) prod worker + staging
   (`docs/MANUAL_SMOKE_TEST.md`).

## Unpark sequence (in order)

1. **Stripe → live.**
   - Paste `sk_live_…` as the prod worker `STRIPE_SECRET_KEY`.
   - Register the **live-mode** webhook `https://withjosephine.com/api/stripe/webhook`; set its `whsec_…` as prod `STRIPE_WEBHOOK_SECRET`.
   - Recreate the 3 Payment Links in live mode.
   - Update the prod Sanity `stripePaymentLink` URLs (all currently `test_…`).
   - The prod read-only smoke's live-link guard (#317) fails if any `test_` link survives — backstop for a missed swap.
2. **Unpark the apex.** Set `NEXT_PUBLIC_UNDER_CONSTRUCTION=0` in **all three**:
   repo variable, `production` environment variable, and the prod worker secret
   of the same name. Redeploy. `curl -sI https://withjosephine.com/` and confirm
   the real site renders (not the holding page).
3. **Enable prod smoke.** Set `APEX_UNPARKED=true` (`production` environment
   variable) so the now-comprehensive prod read-only smoke (#317) runs on deploy.
4. **Prod WAF rate-limit rule** — dex `7h6tfse1` (M1).
5. **Read-only prod smoke only.** Live links are real `buy.stripe.com` charges;
   test card 4242 = a real charge. Never run a write/payment smoke against prod.

## Prod secrets

All present except the intentional Stripe-live swaps above. `ADMIN_API_KEY`
(admin-delete route) and `BREVO_API_KEY` (Brevo GDPR cascade) are absent and
non-blocking — set them only when those paths are exercised.

## Rollback

Re-park by setting `NEXT_PUBLIC_UNDER_CONSTRUCTION=1` in all three locations and
redeploying; the middleware rewrites the apex to the static holding route.
