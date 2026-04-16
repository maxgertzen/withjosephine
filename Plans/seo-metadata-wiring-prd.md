# SEO Metadata Wiring — Developer PRD

**Status:** Draft ready for review
**Owner:** Max
**Date:** 2026-04-15
**Follow-up to:** `Plans/seo-seed-prd.md`

## What this is

The SEO seed script (see `seed-seo.ts`) wrote `seo.metaTitle` / `seo.metaDescription` onto six Sanity docs whose Next.js routes do not currently consume those fields. This PRD closes that gap by adding `generateMetadata` to two dynamic routes and makes a schema-level decision about `bookingPage.seo`.

Scope is intentionally small: three files touched in `src/app/` (two route files + one `studio/schemas/` edit), plus a query update. No new components, no new abstractions, no ogImage work.

## Scope

### In scope

| Route                             | Source doc                                            | Lookup                    | Fallback chain                                        |
| --------------------------------- | ----------------------------------------------------- | ------------------------- | ----------------------------------------------------- |
| `/book/[readingId]/page.tsx`      | `reading.seo` (resolved by slug)                      | `fetchReading(readingId)` | `reading.seo` → `bookingPage.seo` → hard-coded string |
| `/thank-you/[readingId]/page.tsx` | `thankYouPage.seo` (singleton)                        | `fetchThankYouPage()`     | `thankYouPage.seo` → hard-coded string                |
| `bookingPage.seo` (schema)        | Decision: **keep as fallback parent** (see §Decision) | —                         | —                                                     |

### Out of scope

- **Per-reading thank-you SEO** — not needed; the thank-you page is behind `ThankYouGuard` and isn't a target for organic search. One singleton is enough.
- **`ogImage` wiring** — seed script doesn't set these and no image asset has been uploaded. Skipped until assets exist.
- **`robots` / `noindex` posture** for `/thank-you/[readingId]` — separate concern; can be added opportunistically in the same PR if trivial (see §Stretch).
- **Landing, legal, root-layout metadata** — already wired (`src/app/page.tsx`, `src/app/{privacy,terms,refund-policy}/page.tsx`).
- **Schema changes beyond the `bookingPage.seo` decision.**

## Decision: `bookingPage.seo` — keep as fallback parent

**Recommendation:** keep the `seo` field on the `bookingPage` schema and wire it as the fallback for `/book/[readingId]` when `reading.seo.metaTitle` / `metaDescription` is empty.

### Why keep it (not drop)

1. **The seed script already wrote on-brand copy into `bookingPage.seo`.** Dropping the schema field now would orphan that copy or require a second cleanup script.
2. **Per-reading SEO is the ideal state, but not guaranteed.** If Josephine adds a new reading in Studio and forgets to fill SEO, the booking route still needs a sensible title/description — `bookingPage.seo` is the natural parent.
3. **Consistent with how `bookingPage` already behaves** — it's the singleton that provides shared booking-flow copy (email label, disclaimer, button text, etc). Adding "shared booking-flow SEO fallback" fits the same mental model.
4. **Zero runtime cost.** The booking route already calls `fetchBookingPage()` for form copy, so the SEO fields ride on the same query.

### When to revisit

If a future audit shows every `reading` doc reliably has populated SEO and Josephine never edits `bookingPage.seo`, drop the field in a follow-up. For now, it earns its keep as a safety net.

### Anti-criterion

Do **not** show `bookingPage.seo` metadata on top of `reading.seo` metadata (e.g. title templates combining both). Resolution is first-non-empty, not merge.

## Behaviour spec

### `/book/[readingId]/page.tsx`

```ts
export async function generateMetadata({ params }: BookingPageProps): Promise<Metadata> {
  const { readingId } = await params;
  const [reading, bookingPage] = await Promise.all([fetchReading(readingId), fetchBookingPage()]);

  const metaTitle =
    reading?.seo?.metaTitle ?? bookingPage?.seo?.metaTitle ?? `Book a Reading — Josephine`;

  const metaDescription =
    reading?.seo?.metaDescription ??
    bookingPage?.seo?.metaDescription ??
    "Book your reading with Josephine. Voice note and PDF delivered within 7 days.";

  return { title: metaTitle, description: metaDescription };
}
```

- `fetchReading` / `fetchBookingPage` are already imported by the default export on this route — reuse, don't re-import anything new.
- Both fetches happen inside `generateMetadata`; Next.js de-dupes identical fetches inside a single request so the default export's `Promise.all([fetchReading, fetchBookingPage])` will not double-hit Sanity **only if** the query strings are identical. The current queries (`readingBySlugQuery`, `bookingPageQuery`) match, so this is safe.
- If `fetchReading(readingId)` returns `null` (unknown slug), fall through to the `bookingPage`/hard-coded fallback. Do NOT throw — the default export will call `notFound()` on its own; `generateMetadata` should stay defensive.

### `/thank-you/[readingId]/page.tsx`

```ts
export async function generateMetadata(): Promise<Metadata> {
  const thankYouPage = await fetchThankYouPage();
  const seo = thankYouPage?.seo;

  return {
    title: seo?.metaTitle ?? "Thank you — Josephine",
    description: seo?.metaDescription ?? "Your reading is booked. Here's what happens next.",
  };
}
```

- Uses only the singleton. Per-reading SEO is **not** merged in.
- The function signature takes no args — the route slug doesn't affect the metadata.

### Query changes

Both `readingBySlugQuery` and `bookingPageQuery` already project `seo` in full (see `src/lib/sanity/queries.ts:39` and `:110`). No query changes needed.

`thankYouPageQuery` already projects `seo` (line :121). No change.

### Schema changes

**None.** `bookingPage.seo` stays as-is.

## Files touched

| File                                     | Change                                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/app/book/[readingId]/page.tsx`      | Add `generateMetadata` export (above the default export). Import `Metadata` type from `next`. |
| `src/app/thank-you/[readingId]/page.tsx` | Add `generateMetadata` export. Import `Metadata` type from `next`.                            |
| `studio/schemas/bookingPage.ts`          | **No change.** (Decision documented here.)                                                    |

No new files. No type changes (`SanityReading.seo` and `SanityBookingPage.seo` are already typed).

## Fallback copy (hard-coded last resort)

If both Sanity fetches return empty/null, use these strings. They should never ship in production, but are required so TypeScript is happy and the page never renders empty metadata.

| Route                    | Title fallback               | Description fallback                                                            |
| ------------------------ | ---------------------------- | ------------------------------------------------------------------------------- |
| `/book/[readingId]`      | `Book a Reading — Josephine` | `Book your reading with Josephine. Voice note and PDF delivered within 7 days.` |
| `/thank-you/[readingId]` | `Thank you — Josephine`      | `Your reading is booked. Here's what happens next.`                             |

Both stay within Google's ~60/160 char targets and match the brand voice guardrails in `brand/STYLE_GUIDE.md` §9.

## Verification

### Local

1. `pnpm dev`
2. Visit `/book/soul-blueprint` → view source → confirm `<title>` and `<meta name="description">` reflect `reading-soul-blueprint.seo.metaTitle` / `metaDescription`.
3. In Studio, clear `reading-soul-blueprint.seo.metaTitle` only, publish, hard-reload → confirm `<title>` falls back to `bookingPage.seo.metaTitle`.
4. In Studio, clear `bookingPage.seo.metaTitle` too, publish, hard-reload → confirm `<title>` falls back to the hard-coded string.
5. Visit `/thank-you/soul-blueprint` → view source → confirm metadata comes from `thankYouPage.seo`.

### Tests

- No new Vitest coverage required — `generateMetadata` is thin glue over existing `fetch*` functions that already have coverage in `src/lib/sanity/fetch.test.ts`.
- If adding a test feels right, assert the fallback chain shape in a unit test against the generateMetadata function directly. Optional.

### Build

- `pnpm build` must pass. Because both routes already use `generateStaticParams`, `generateMetadata` will be invoked per static param at build time — confirm no Sanity timeouts in the build log.

## Stretch (optional, same PR if trivial)

- Add `robots: { index: false, follow: false }` to `/thank-you/[readingId]` metadata. The page is post-payment and should not be crawled. Zero-risk addition; ~2 lines.

## Risks

- **Build-time Sanity load.** Each `readingId` param triggers a `fetchReading` + `fetchBookingPage` call inside `generateMetadata`, plus another pair inside the default export. Next.js de-dupes at the fetch level, but only for `fetch()` — the Sanity client uses its own transport. If build time balloons, memoize `fetchBookingPage` with `react.cache` (already used for `fetchLegalPage` at `src/lib/sanity/fetch.ts:68`). Not pre-emptively changing — revisit if build perf regresses.
- **Stale metadata on edit.** Current deploy is static-at-build. A change to `reading.seo` in Studio won't reflect until the next build. This matches every other page on the site and is acceptable; out of scope.

## Sign-off

- [ ] `/book/[readingId]` shows Sanity-sourced title/description on a known slug
- [ ] Fallback chain verified: `reading.seo` → `bookingPage.seo` → hard-coded
- [ ] `/thank-you/[readingId]` shows Sanity-sourced title/description from the singleton
- [ ] `pnpm build` passes with no new warnings
- [ ] Decision logged: `bookingPage.seo` kept as fallback parent (schema unchanged)
