# Josephine Soul Readings

Website for Josephine's astrology and Akashic Record reading practice.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **CMS:** Sanity v3 + Presentation Tool (live preview)
- **Styling:** Tailwind CSS v4 with CSS custom properties design tokens
- **Animations:** Motion (Framer Motion)
- **Payments:** Stripe Checkout (hosted payment links — no SDK)
- **Contact Form:** Web3Forms + hCaptcha
- **Hosting:** Cloudflare Workers via OpenNext
- **Testing:** Vitest + React Testing Library
- **Component Dev:** Storybook

## Prerequisites

- Node.js 22+
- pnpm 9+

## Getting Started

```bash
pnpm install
cp .env.local.example .env.local  # fill in your values
pnpm dev
```

The site runs at `http://localhost:3000`. Sanity Studio runs separately:

```bash
pnpm studio:dev  # http://localhost:3333
```

## Scripts

| Script                 | Description                                           |
| ---------------------- | ----------------------------------------------------- |
| `pnpm dev`             | Start Next.js dev server                              |
| `pnpm build`           | Production build (runs token + font generation first) |
| `pnpm cf:build`        | Build for Cloudflare Workers                          |
| `pnpm lint`            | ESLint check                                          |
| `pnpm lint:fix`        | ESLint autofix (includes import sorting)              |
| `pnpm format`          | Prettier format all files                             |
| `pnpm format:check`    | Prettier check (CI-friendly)                          |
| `pnpm typecheck`       | TypeScript strict check                               |
| `pnpm test`            | Run tests                                             |
| `pnpm test:watch`      | Run tests in watch mode                               |
| `pnpm storybook`       | Start Storybook on port 6006                          |
| `pnpm storybook:build` | Build static Storybook                                |
| `pnpm studio:dev`      | Start Sanity Studio locally                           |
| `pnpm studio:build`    | Build Sanity Studio                                   |
| `pnpm studio:deploy`   | Deploy Sanity Studio                                  |

## Project Structure

```
public/              # Static assets (images, _headers)
scripts/             # Seed and generation scripts
src/
  ├── app/             # Next.js App Router pages
  │   ├── api/draft/   # Sanity draft mode endpoints
  │   ├── book/        # Booking pages (dynamic by reading)
  │   ├── thank-you/   # Post-purchase confirmation
  │   ├── privacy/     # Legal pages (privacy, terms, refund policy)
  │   └── ...
  ├── components/      # React components (co-located tests)
  ├── data/            # Static fallback data (readings, testimonials)
  ├── hooks/           # Custom React hooks
  ├── lib/
  │   ├── sanity/      # Sanity client, queries, types, mappers
  │   └── ...          # Utilities, constants, feature flags
  └── styles/          # Tailwind tokens and overrides
studio/              # Sanity Studio (separate package)
docs/                # Project documentation
```

## Environment Variables

See `.env.local.example` for the full list. Key variables:

- `NEXT_PUBLIC_SANITY_PROJECT_ID` / `NEXT_PUBLIC_SANITY_DATASET` — Sanity project
- `SANITY_READ_TOKEN` — Server-side content fetching and draft mode
- `RESEND_API_KEY` / `NOTIFICATION_EMAIL` — transactional email (booking confirmations, contact form)
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` — Cloudflare Turnstile spam protection
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — Payment Links + webhook
- `R2_*` — booking-photo upload bucket
- `LISTEN_TOKEN_SECRET` — HMAC secret signing `/listen/[token]` URLs
- `NEXT_PUBLIC_UNDER_CONSTRUCTION` — Feature flag to show holding page
- `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` — Cloudflare Web Analytics

## Code Quality

Prettier and ESLint run on all source files:

- **Prettier:** Double quotes, semicolons, trailing commas, 100 char width
- **ESLint:** Next.js + core-web-vitals + TypeScript rules
- **Import sorting:** `eslint-plugin-simple-import-sort` for deterministic ordering

Before pushing:

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## Deployment

The site deploys to **Cloudflare Workers** via wrangler. The build pipeline:

1. `pnpm cf:build` runs the Next.js build then the OpenNext adapter
2. `wrangler deploy` pushes the worker and static assets to Cloudflare

Sanity Studio is deployed separately via `pnpm studio:deploy` to Sanity's hosted infrastructure.
