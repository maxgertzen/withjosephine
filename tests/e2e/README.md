# End-to-end Playwright specs

Two modes. Pick by env flag.

## Default local mode (no flags — runs in CI on PRs)

```bash
pnpm exec playwright test --project=chromium
```

- `pnpm dev` + fixture sidecar (Hono) started in parallel by Playwright's
  `webServer` array (see `playwright.config.ts`).
- Sanity reads served from JSON fixtures in `src/__fixtures__/sanity/e2e/`;
  Sanity writes captured by the sidecar's in-memory ops log.
- Resend never sends — `RESEND_DRY_RUN=1` short-circuits at the call site;
  payloads are POSTed to the sidecar capture store when `E2E_CAPTURE_URL`
  is set so specs can assert "would have sent X".
- Stripe Payment Link (`buy.stripe.com/*`) intercepted browser-side via
  `page.route()` in each spec.
- D1 reset between tests via `POST /api/e2e-reset` (test-only route gated
  on `E2E=1` + `ENVIRONMENT !== "production"` + secret header).

Specs: `booking-copy`, `gift-flow`, `intake-errors`, `intake-page`.

## Local round-trip mode (sibling to remote, env-flag opt-in)

```bash
# Set all three — runs ~36s total
E2E_STRIPE_LOCAL=1 E2E_GIFT_LOCAL=1 E2E_LISTEN_LOCAL=1 \
  pnpm exec playwright test --project=chromium
```

Same infra as default. Adds full round-trip coverage with mocked Stripe +
signed webhook fire from the spec (`tests/e2e/helpers/stripeWebhook.ts`).
Specs:

- `stripe-local`: booking → mock Stripe → signed webhook → Sanity mirror +
  email capture asserts; plus bad-signature, unknown-submission, missing-
  consent unhappy paths.
- `gift-local`: gift purchase (scheduled + self_send) → mock Stripe → signed
  webhook; plus gift-redeem 401, gift purchase 400 missing consent.
- `listen-local`: cold-visit sign-in, magic-link request redirect contract,
  garbage-token verify, internal issue-magic-link 404 paths.

CI runs all three families simultaneously via `.github/workflows/e2e.yml`.

## Remote round-trip mode (staging, manual)

```bash
# Requires .env.staging sourced (CF Access service-token + Sanity tokens)
set -a && source .env.staging && set +a

E2E_STRIPE_ROUNDTRIP=1 pnpm exec playwright test
E2E_GIFT_ROUNDTRIP=1 pnpm exec playwright test
E2E_LISTEN_ROUNDTRIP=1 pnpm exec playwright test  # currently fixme'd
```

Targets `https://staging.withjosephine.com`. Skips the fixture sidecar +
webServer entirely; uses real Stripe sandbox + real Sanity staging dataset.
Run manually for full-stack smoke after substantial changes; not in CI
on PRs.

## Flag plumbing

Single source of truth: `tests/e2e/helpers/roundtripFlags.ts`. Adding a
new flag means extending the `RoundtripFlag` union, the `ROUNDTRIPS`
descriptor array, and either `activeRemoteRoundtrip()` /
`activeLocalRoundtrips()` callers.

## Sidecar introspection (debug)

```bash
# Sidecar listens on 47391 when the local Playwright session is active
curl http://127.0.0.1:47391/_e2e/health
curl http://127.0.0.1:47391/_e2e/captured-mutations
curl http://127.0.0.1:47391/_e2e/captured-emails
```

`E2E_SIDECAR_DEBUG=1` enables request-level logging.
