# E2E specs

Two modes — one flag.

## Mock mode (default; runs in CI)

```bash
pnpm exec playwright test
```

Targets `pnpm dev` + a fixture sidecar (Hono on port 47391) started in parallel
by Playwright's `webServer` array. Sanity reads served from JSON fixtures;
Sanity writes captured as an ops log; Resend short-circuits via
`RESEND_DRY_RUN=1` and posts payloads to the sidecar for spec assertions;
Stripe Payment Link intercepted browser-side via `page.route()`. D1 reset
between tests via `POST /api/e2e-reset` (test-only, defense-in-depth gated).

## Sandbox mode (manual, against staging)

```bash
set -a && source .env.staging && set +a
E2E_SANDBOX=1 pnpm exec playwright test
```

Targets `https://staging.withjosephine.com` with real Stripe sandbox + real
Sanity staging dataset. Requires CF Access service-token + Sanity tokens
in `.env.staging`. Spec selection is by filename: `*-roundtrip.spec.ts`
files run in sandbox mode, everything else runs in mock mode.

## Sidecar introspection

```bash
curl http://127.0.0.1:47391/_e2e/health
curl http://127.0.0.1:47391/_e2e/captured-mutations
curl http://127.0.0.1:47391/_e2e/captured-emails
```

`E2E_SIDECAR_DEBUG=1` enables request logging.
