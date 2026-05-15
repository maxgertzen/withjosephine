# E2E Testing — Playwright + Hono fixture sidecar

End-to-end tests for the booking + gift flows. Lives at `tests/e2e/`. Owns the safety net that lets the IntakeForm refactor (Phase 2) and downstream compliance / UX phases land without regressing the customer-facing surface.

## Quick start

```bash
pnpm exec playwright test --project=chromium
```

That command boots:
1. **Fixture sidecar** (Hono, OS-assigned port). Serves Sanity GROQ queries from `src/__fixtures__/sanity/e2e/*.json` instead of hitting real api.sanity.io.
2. **MSW handlers** (defense-in-depth) for Stripe + Resend.
3. **Next dev server** (`pnpm dev`, Turbopack). `SANITY_API_HOST` env var is set to the sidecar URL by globalSetup; the Sanity client honors it (`src/lib/sanity/client.ts`).
4. **Chromium** runs the spec files in `tests/e2e/specs/`.

First run installs Chromium (~100 MB). Subsequent runs reuse the cache.

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│ Playwright test process                                            │
│  ├─ globalSetup                                                    │
│  │   ├─ assert env-guards (STRIPE_SECRET_KEY sk_test_ only)        │
│  │   ├─ start Hono sidecar on port 0 → SANITY_API_HOST             │
│  │   └─ register MSW handlers (Stripe + Resend)                    │
│  ├─ chromium (browser)                                             │
│  │   ├─ navigates to http://localhost:3000/book/...                │
│  │   └─ page.route('https://buy.stripe.com/**', mock)              │
│  └─ globalTeardown                                                 │
│      └─ stop sidecar + close MSW                                   │
└────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ Next dev server (child process, separate Node runtime)             │
│  ├─ Inherits process.env (incl. SANITY_API_HOST)                   │
│  ├─ Sanity client points at sidecar (not api.sanity.io)            │
│  └─ Resend / Stripe SDK calls — NOT intercepted by MSW             │
│     (cross-process; use env-gated mock clients if needed — D-9/19) │
└────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP (GROQ + /listen)
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│ Hono fixture sidecar                                               │
│  ├─ /v<api>/data/query/<dataset>?query=... → fixture JSON          │
│  ├─ /v<api>/data/live/events/<dataset>     → empty SSE heartbeat   │
│  ├─ /images, /files                        → 404                   │
│  └─ /_e2e/health                           → debug info            │
└────────────────────────────────────────────────────────────────────┘
```

## Refreshing fixtures

Fixtures are committed JSON snapshots from the **staging** Sanity dataset, anonymized per PRD D-12. Refresh when:

- Sanity schema changes (new bookingForm field, new doc type)
- A test needs a new shape of data
- Staging copy changes that the tests assert against

```bash
# Loads project ID + read token from .env.local
set -a; source .env.local; set +a
pnpm exec tsx scripts/generate-e2e-fixtures.ts
```

The script writes to `src/__fixtures__/sanity/e2e/`. Inspect the diff, commit the JSON.

### Anonymization (PRD D-12)

The fixture-gen script automatically:

- Replaces all email addresses (`hello@*`, any `*@*.*` pattern) with `e2e-test@withjosephine.com`
- Replaces real-people names (denylist: Josephine, Becky, Natali, Likush, Alma, Max, Maxim) with `[E2E-Author]`
- Clears any field with key in the PII set: `contactEmail`, `fromAddress`, `toAddress`, `phone`, `tel`, `phoneNumber`, `purchaserEmail`, `recipientEmail`

**Always diff fixtures before committing.** If a new PII-bearing field type appears, extend `PII_KEYS` / `REAL_NAMES` in `scripts/generate-e2e-fixtures.ts` and regenerate.

## Adding a test

1. New spec file at `tests/e2e/specs/<feature>.spec.ts`.
2. **Role-based locators only** (`getByRole`, `getByLabel`, `getByText`). NO CSS selectors, NO `data-testid`. This is a hard invariant — it's the only thing that makes the Phase 2 IntakeForm refactor non-shattering.
3. If the behavior under test only ships in a later phase, scaffold with `test.fixme(true, "Unblocked by P<N> — <explanation>.")` so CI is green today and the test gets un-fixme'd at the right time.
4. Run locally: `pnpm exec playwright test`.

## Env vars

Required in test environment (set explicitly in CI yaml, copy to `.env.e2e` locally if you want):

| Var | Value | Why |
|-----|-------|-----|
| `NEXT_PUBLIC_R2_PUBLIC_HOST` | `images.withjosephine.com` | `src/lib/constants.ts:38` throws at module-init if missing; locally provided by `.env.local`, must be set explicitly in CI |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | `e8jsb14m` | Sanity client init |
| `NEXT_PUBLIC_SANITY_DATASET` | `production` | Sanity client init |
| `STRIPE_SECRET_KEY` | `sk_test_...` | globalSetup aborts if not `sk_test_` prefix |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `1x00000000000000000000AA` | CF's always-pass testing key |
| `NEXT_PUBLIC_BOOKING_TURNSTILE_BYPASS` | `1` | IntakeForm bypass flag |
| `NEXT_PUBLIC_UNDER_CONSTRUCTION` | `false` | Apex / holding-page flag |
| `NEXT_PUBLIC_TRACK_NON_PROD` | `false` | Analytics gate |
| `BOOKING_TURNSTILE_BYPASS` | `1` | Server-side bypass flag |
| `TURNSTILE_SECRET_KEY` | `1x0000000000000000000000000000000AA` | CF's always-pass secret |
| `LISTEN_TOKEN_SECRET` | `e2e_listen_token_secret_dummy` | Listen-page HMAC |
| `ADMIN_API_KEY` | `e2e_admin_api_key_dummy` | Admin route guard |
| `E2E` | `1` | Marker for any future env-gated client swaps |

`SANITY_API_HOST` is set automatically by globalSetup at runtime — don't override.

## CI gate + D-4 grandfathering

Workflow: `.github/workflows/e2e.yml`. Triggers on PR opens / updates whenever paths-of-interest change (intake/gift components, booking routes, Sanity schema, fixtures, the workflow file itself).

Per PRD D-4, the `release/v1.0.0` → `main` merge is **grandfathered** out of this gate — it carries pre-Phase-0 commits. The workflow still runs for signal value; whether failures block the merge is controlled by the branch-protection rule in repo admin. After Phase 0 merges, enable the required-check rule for PRs that target `main` AND were opened on or after the Phase 0 merge commit.

## Cross-process limitations (D-19)

MSW's `setupServer` intercepts fetches **in the calling Node process only**. Playwright globalSetup runs in the test process; Next dev runs as a separate child process. **MSW handlers in this repo do NOT intercept** Resend / api.stripe.com calls made from Next API routes.

For Phase 0's 8 tests this doesn't matter — booking happy-path doesn't synchronously call Resend or api.stripe.com (cron-fired email, no Stripe API call on the customer path). The Stripe redirect to `buy.stripe.com` IS intercepted via Playwright's `page.route()`, which works browser-side.

If a future test needs the email-fire path or Stripe SDK path: implement Plan B per D-9 — env-gated Resend + Stripe clients with `process.env.E2E === '1'` switching to mock impls inside the Next process.

## TDD-target tests (D-21)

Most current specs use `test.fixme(true, "Unblocked by P<N>.")` because they describe behavior that ships in Phase 1 / 1.5 / 3 / 4. Phase 0 ships:
- 3 GREEN tests (`intake-page.spec.ts:Intake page renders (smoke)`)
- 11 FIXME tests (un-fixme as each phase lands its compliance + UX fixes)

CI green = no failing non-fixme tests. Fixmes are tracked but skipped.
