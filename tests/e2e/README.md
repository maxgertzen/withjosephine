# E2E specs

Two modes — one flag.

## Mock mode (default; runs in CI)

```bash
pnpm exec playwright test
```

Targets `pnpm dev` + a fixture sidecar (Hono on port 47391) started in parallel
by Playwright's `webServer` array.

The mock seam — what intercepts what:

- **Sanity reads** — served from JSON fixtures in `src/__fixtures__/sanity/e2e/` via the sidecar; the Next dev server has `SANITY_API_HOST` pointed at the sidecar URL.
- **Sanity writes** — captured as an ops log by the sidecar (`GET /_e2e/captured-mutations`).
- **Resend** — short-circuits via `RESEND_DRY_RUN=1` and posts captured payloads (label / to / subject / html) to the sidecar (`GET /_e2e/captured-emails`).
- **Stripe Payment Link redirect** — intercepted browser-side via `page.route("https://buy.stripe.com/**", …)` (helper: `tests/e2e/helpers/stripeCheckout.ts`).
- **Stripe webhook** — fired by specs directly via signed POST to `/api/stripe/webhook` (helper: `tests/e2e/helpers/stripeWebhook.ts`).
- **Turnstile** — `BOOKING_TURNSTILE_BYPASS=1` short-circuits server verification; for manual-execute widgets, browser-side stub at `tests/e2e/helpers/turnstileStub.ts`.
- **D1 reset between tests** — `await resetE2EDatabase(request)` (helper: `tests/e2e/helpers/e2eReset.ts`) POSTs to `/api/e2e-reset` with the `x-e2e-reset-token` header. The header is added by the helper only — not broadcast on every request via `extraHTTPHeaders`.

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
