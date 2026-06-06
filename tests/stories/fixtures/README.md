# Story Fixtures

Centralised mock data for Storybook stories. Stories under `src/**/*.stories.tsx` import their `args` shapes from this tree rather than hardcoding fixture data inline.

## Layout

```
tests/stories/fixtures/
├── pages/             # Pages/<X> story fixtures (one file per route or surface)
│   ├── legal/         # Long-form legal page content (children JSX for LegalPageLayout)
│   └── ...
└── components/        # Components/<subcategory>/<X> story fixtures
```

## Rules

- Stories that already pull from `src/data/defaults.ts` (e.g. `NOT_FOUND_PAGE_DEFAULTS`, `MAGIC_LINK_VERIFY_PAGE_DEFAULTS`) keep using those production fallbacks; they ARE the canonical fixtures. Only add to this tree when a story needs content NOT present in `defaults.ts`.
- Pure-data fixtures use `.ts`. Fixtures containing JSX (e.g. legal page content blocks) use `.tsx`.
- Each fixture exports a named const (e.g. `LISTEN_VIEW_DELIVERED_STATE`, `PRIVACY_STORY_CONTENT`), not a default export.
- Tests under `tests/e2e/fixtures/` are unrelated to Storybook; that tree holds Playwright-side fixtures.
