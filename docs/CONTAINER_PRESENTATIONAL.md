# Container / Presentational Convention

Architectural pattern for all customer-facing pages. Locked 2026-06-02 via dex epic `k7snhn1p` (PRD: `MEMORY/WORK/20260602-095014_container-presentational-split-prd/PRD.md`, COUNCIL: same folder).

Storybook is the enforcement surface: stories render Views in isolation with fixture props. A View that cannot be storied is a View whose seams are wrong.

## Container

`page.tsx` IS the container by default. Its job:

1. Read workerd bindings (`getCloudflareContext({async: true})` for D1, R2, DO).
2. Issue Sanity GROQ fetches.
3. Read auth state (cookies, session).
4. Derive the fully-resolved data the View needs.
5. Return `<XxxView {...derived} />`.

Extract a sibling helper MODULE (named functions, not a React component) only when `page.tsx` exceeds ~40 LOC or mixes 3+ concerns (auth + data + state derivation + render). The helper file is named after the derivation, not the page: `deriveListenViewState.ts`, `deriveThankYouViewProps.ts`. Precedents already in the codebase: `deriveDeliveredState` and `deriveThankYouViewProps` inside `src/app/(authed)/listen/[id]/page.tsx` and `src/app/(authed)/thank-you/[readingId]/page.tsx`.

There is no `XxxPage.tsx` component. Next 16's route convention is that `page.tsx` is the route entry; introducing a sibling component file adds a hop with no Next-side semantics.

## Presentational (View)

`XxxView.tsx` co-located INSIDE the route folder when consumed by exactly one route:

```
src/app/(authed)/listen/[id]/
├── page.tsx                  ← container
├── ListenView.tsx            ← presentational
├── ListenView.stories.tsx    ← Storybook
└── ListenView.test.tsx       ← (when behavior warrants)
```

Promote to `src/components/XxxView/` ONLY when 2+ routes consume the same View. The rule mirrors the existing codebase pattern for non-View components (`Footer`, `BookingFlowHeader` are shared and live under `src/components/`; route-specific Views co-locate).

A View MAY hold local UI state (form field values, dropdown open/closed, toggle states). A View MUST NOT hold data-fetch state. If the View needs data, the container fetches it and passes it as a prop.

The View receives all data as props. Its prop shape is the data contract for the route, and the story file's fixtures document the surface area.

## Workerd-binding rule (load-bearing)

The presentational View MUST NOT, directly or transitively, import:

- `@opennextjs/cloudflare` (`getCloudflareContext`)
- `next/headers`, `next/cache`, `server-only`
- Any module under `src/lib/booking/*` or `src/lib/auth/*` (these reach bindings)

A View that imports a helper that imports a binding-touching module still crosses the workerd seam. Surface-file inspection is insufficient. Enforcement is `scripts/check-stories-import-graph.mts` (filed as dex `i9xgm11t`), wired into the `pnpm storybook:build` CI gate.

`src/lib/sanity/*` is NOT on the forbid list. View import-of-Sanity-helpers is allowed (the escape hatch for future RSC-page stories via `sb.mock`), though the default for v1.9.0+ stories is prop-injection of fixtures: cheaper, deterministic, zero network.

## StyleProvider (theme + font wiring)

`src/components/StyleProvider/StyleProvider.tsx` is the single source of truth for theme tokens and font CSS variables. The module exports both:

- `styleProviderClassName`: a string constant that applies `displayFont.variable` + `bodyFont.variable`. Used by `src/app/layout.tsx` on `<body>` so the CSS variable cascade reaches every descendant from body level.
- `<StyleProvider>`: a React component that wraps children in a div carrying `styleProviderClassName`. Used as a global Storybook decorator in `.storybook/preview.ts` so every story renders with the production font wiring.

Both consumers reference the same module. Adding a new global theme variable means editing this one file.

next/font's CSS variables propagate via standard CSS cascade. The className can be applied to any element, not just `<html>`. Vendor reference: [Next.js Font Optimization, Using Multiple Fonts](https://nextjs.org/docs/app/building-your-application/optimizing/fonts#using-multiple-fonts).

`.storybook/storybook-fonts.css` is gone. It set the wrong variable names (`--font-cormorant` instead of `--font-display-source`) and loaded fonts via runtime Google Fonts CSS import. Replaced atomically by the StyleProvider decorator.

## Error-boundary carve-out

`src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/global-error.tsx` are EXEMPT from container/presentational split. Project binding constraints (CLAUDE.md, Architecture notes):

- Error boundaries must never fetch CMS data (Sanity could be what's down).
- `global-error.tsx` inlines its own fonts and styles since root layout may be broken.

These surfaces are inherently presentational by binding constraint, with no data to derive. Their Storybook stories MUST opt out of the `<StyleProvider>` decorator via `parameters: { styleProvider: false }` to mirror the production constraint that they cannot depend on the styling chain.

## Storybook contract

- Every View has a `XxxView.stories.tsx` next to it.
- Containers (`page.tsx` and helper modules like `deriveXxxViewState.ts`) are NEVER storied.
- Story files are pure prop-injection by default. The fixture types come from `src/data/defaults.ts` (canonical defaults) or hand-authored fixtures co-located with the story.
- Multi-state pages get one story per discriminated state (see `ListenView` 6-state pattern, RESEARCH.md §3 of `MEMORY/WORK/20260523-203500_storybook-page-stories-research/`).

## When NOT to split

Routes left as-is in the 2026-06-02 audit:

- Trivial RSC pages under ~60 LOC with no significant rendering surface: `/gift/claim`, `/gift/already-submitted`, `/(authed)/gift/claim/[token]`, `/(authed)/my-readings/welcome`, `/auth/revoked`, `/auth/revoked-error`.
- Pages that orchestrate already-presentational sub-components without their own render logic: `/` (home), `/dev-preview/library` (dev-only).
- Pages that already wrap a shared presentational shell: `/privacy`, `/terms`, `/refund-policy` (all use `LegalPageLayout`).

When a route exceeds ~100 LOC of rendering JSX OR introduces a stateful interactive surface, the split becomes load-bearing and the per-page dex task gets filed.
