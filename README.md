# Josephine Soul Readings

Booking and content website for an astrology and Akashic Record reading practice. Customers browse readings, pay via Stripe, submit intake details, and receive a voice note + PDF delivery. Reading content, copy, and theming are CMS-driven; payments, intake, and delivery are handled by the Worker runtime.

[![CI](https://github.com/maxgertzen/withjosephine/actions/workflows/ci.yml/badge.svg)](https://github.com/maxgertzen/withjosephine/actions/workflows/ci.yml)

---

## Tech Stack

| Layer              | Choice                                                                                |
| ------------------ | ------------------------------------------------------------------------------------- |
| Framework          | Next.js 16 (App Router, React 19)                                                     |
| Runtime            | Cloudflare Workers via `@opennextjs/cloudflare`                                       |
| CMS                | Sanity v3 + Presentation Tool (live preview, deployed Studio)                         |
| Styling            | Tailwind CSS v4 with CSS-custom-property design tokens                                |
| Animation          | Motion (Framer Motion successor)                                                      |
| Payments           | Stripe Payment Links (hosted) + webhook + reconcile cron                              |
| Database           | Cloudflare D1 (production); `better-sqlite3` (local dev)                              |
| Object storage     | Cloudflare R2 (booking photos, dataset backups)                                       |
| Durable Objects    | `GiftClaimScheduler` — alarms for scheduled gift-claim emails                         |
| Transactional mail | Resend                                                                                |
| Spam protection    | Cloudflare Turnstile                                                                  |
| Observability      | Sentry (server + client), Mixpanel, Microsoft Clarity                                 |
| Testing            | Vitest + React Testing Library + happy-dom                                            |
| Component dev      | Storybook                                                                             |

---

## Prerequisites

- Node.js 22+
- pnpm 9+
- A Sanity project (project ID + dataset) — see `.env.local.example`
- Optional for full local parity: Cloudflare account (R2 + D1), Stripe sandbox, Resend sandbox, Turnstile site keys

## Local Development

```bash
pnpm install
cp .env.local.example .env.local   # fill in required values
pnpm dev                            # Next.js on http://localhost:3000
```

Sanity Studio runs as a separate package:

```bash
pnpm studio:dev                     # http://localhost:3333
```

To run the Worker locally (closer to production parity, with bindings):

```bash
pnpm cf:build
pnpm cf:dev                         # Wrangler on http://localhost:8788
```

D1 migrations against the local SQLite file:

```bash
pnpm migrate:apply:local
```

## Environment Variables

`.env.local.example` is the source of truth for the full list. Key groups:

- **Sanity** — `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `SANITY_READ_TOKEN`, `SANITY_WRITE_TOKEN`
- **Payments** — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- **R2** — `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
- **Mail** — `RESEND_API_KEY`, `NOTIFICATION_EMAIL`
- **Auth / signing** — `LISTEN_TOKEN_SECRET`, `CRON_SECRET`, `DO_DISPATCH_SECRET`
- **Anti-abuse** — `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`
- **Observability** — `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_MIXPANEL_TOKEN`, `NEXT_PUBLIC_CLARITY_PROJECT_ID`
- **Feature flags** — `NEXT_PUBLIC_UNDER_CONSTRUCTION` (holding page toggle)

Production secrets live in Cloudflare (`wrangler secret put`) and are documented inline in `wrangler.jsonc`. See `SECRETS_CHECKLIST.md`.

## Build and Deploy

GitHub Actions (`.github/workflows/ci.yml`) gates every push behind lint, typecheck, test, security audit (OSV), and Storybook build. Deploys are push-triggered:

- **Push to `main`** → builds and deploys to the **staging** Worker (`withjosephine-staging` → `staging.withjosephine.com`); after staging succeeds, the same workflow runs the **production** deploy job (`withjosephine` → `withjosephine.com`).
- **Push to `release/*` branches** → deploys to staging only. Production stays main-only. Use these for long-lived release cuts where multiple PRs land on staging before the cut promotes to main.
- **Pull requests** → CI runs (lint, typecheck, test, security audit, Storybook), no deploy.

The build wraps `next build` with the OpenNext Cloudflare adapter, strips the unused `@vercel/og` blob to fit Workers' compressed bundle limit, and uploads sourcemaps to Sentry. Sanity Studio deploys independently via `pnpm studio:deploy` to Sanity's hosted infrastructure.

D1 migrations are applied out of band:

```bash
pnpm migrate:apply:staging
pnpm migrate:apply:prod
```

## Project Structure

```
www/
├── custom-worker.ts        # Worker entry — wraps OpenNext handler with Sentry
├── wrangler.jsonc          # Cloudflare bindings: R2, D1, DOs, crons, rate limits
├── migrations/             # D1 SQL migrations
├── public/                 # Static assets
├── scripts/                # Token/font generation, Sanity sync, backfill scripts
├── studio/                 # Sanity Studio (separate pnpm workspace)
├── docs/                   # Engineering docs (see Documentation Map)
├── src/
│   ├── app/                # Next.js App Router routes
│   │   ├── api/            # Booking, webhooks, listen-auth, cron endpoints
│   │   ├── book/           # Booking flow (dynamic per reading)
│   │   ├── listen/         # Magic-link-gated delivery surface
│   │   ├── my-gifts/       # Gift purchaser self-service
│   │   └── thank-you/      # Post-checkout confirmation
│   ├── components/         # React components with co-located tests + stories
│   ├── data/               # Static fallbacks (used when CMS is unreachable)
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Sanity client, booking persistence, Stripe, email, auth
│   ├── middleware.ts       # CSP, holding-page gate, soft-launch allowlist
│   └── styles/             # Tailwind tokens
└── README.md
```

## Scripts

| Script                       | Purpose                                                                  |
| ---------------------------- | ------------------------------------------------------------------------ |
| `pnpm dev`                   | Start Next.js dev server                                                 |
| `pnpm build`                 | Production Next build (runs `prebuild` token/font/Sanity sync first)     |
| `pnpm cf:build`              | Build the Cloudflare Worker bundle (Next build + OpenNext + sourcemaps)  |
| `pnpm cf:dev`                | Run the Worker locally via Wrangler                                      |
| `pnpm lint` / `pnpm lint:fix`| ESLint check / autofix (Next + core-web-vitals + simple-import-sort)     |
| `pnpm format:check`          | Prettier check (CI-friendly)                                             |
| `pnpm typecheck`             | TypeScript strict check (app + scripts tsconfig)                         |
| `pnpm test` / `pnpm test:watch` | Vitest run / watch                                                    |
| `pnpm storybook`             | Storybook on port 6006                                                   |
| `pnpm studio:dev`            | Sanity Studio dev server                                                 |
| `pnpm studio:deploy`         | Deploy Sanity Studio                                                     |
| `pnpm migrate:apply:*`       | Apply D1 migrations (`:local`, `:staging`, `:prod`)                      |
| `pnpm analyze`               | Bundle analyzer (`ANALYZE=true next build`)                              |

Run before pushing:

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## Documentation Map

| Document                                                                          | Purpose                                                                                       |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md)                                          | Per-PR shipped history with summaries.                                                        |
| [`docs/ADR-001-persistence.md`](docs/ADR-001-persistence.md)                      | Decision: D1 as source of truth for bookings; Sanity mirrors for editor workflow.             |
| [`docs/POST_LAUNCH_BACKLOG.md`](docs/POST_LAUNCH_BACKLOG.md)                      | Deferred items — security follow-ups, infra cleanups, code polish.                            |
| [`docs/LAUNCH_SMOKE_TEST_PLAN.md`](docs/LAUNCH_SMOKE_TEST_PLAN.md)                | End-to-end smoke tests for staging and production launches.                                   |
| [`docs/OPERATIONS.md`](docs/OPERATIONS.md)                                        | D1 migrations, Sanity dataset re-seeding, Mixpanel funnels — recurring operational tasks.     |
| [`docs/runbooks/STAGING_RUNBOOK.md`](docs/runbooks/STAGING_RUNBOOK.md)            | Staging environment provisioning + Cloudflare Access patterns + verification.                 |
| [`docs/runbooks/CLOUDFLARE_SETUP.md`](docs/runbooks/CLOUDFLARE_SETUP.md)          | Cloudflare provisioning reference — bindings, secrets, Custom Domains, env separation.        |
| [`docs/runbooks/SANITY_BACKUP_RUNBOOK.md`](docs/runbooks/SANITY_BACKUP_RUNBOOK.md) | Weekly dataset backup cron — NDJSON streaming to R2 with Bucket Locks + live mirror.         |
| [`SECRETS_CHECKLIST.md`](SECRETS_CHECKLIST.md)                                    | Inventory of every secret and where it's set (CF, Sanity, Stripe, GitHub Actions).            |

## Conventions

- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`). No AI-attribution lines, no co-author tags.
- **Code style:** Self-documenting names. Comments only when intent is non-inferable. Prettier (double quotes, semicolons, trailing commas, 100-char width). ESLint with `simple-import-sort`. No `any` — use `unknown` + narrowing.
- **Tests:** Co-located (`Component.tsx` next to `Component.test.tsx`). TDD encouraged for business logic.
- **Design tokens:** Tokens are the source of truth; never use Tailwind `@apply`. New colors go through `src/styles/tokens.css` and the Sanity theme document.
- **Sanity changes:** Schema is the contract — fetch live data before editing, push back via the Studio or a migration script in `scripts/`.

## Project Context

`CLAUDE.md` files exist at the repo root and in `www/` for agent/team context — they are not required reading to contribute. The two files that ARE load-bearing for any non-trivial change are `docs/POST_LAUNCH_BACKLOG.md` (deferred work, must be read before planning) and `docs/CHANGELOG.md` (what shipped when).
