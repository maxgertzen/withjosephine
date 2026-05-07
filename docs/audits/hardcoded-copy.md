# Hardcoded Customer-Facing Copy Audit

**Generated:** 2026-05-07 in `feat/csp-nonce-and-audits`.

## Method

Walked `src/components/**` and `src/app/**` for string literals visible to customers. Cross-referenced each against `studio/schemas/*.ts` to determine whether a Sanity field already exists (and is wired up, vs. projected-but-unused, vs. missing entirely).

Each string tagged with editor-iteration-value:

- **HIGH** — Becky / Josephine will demonstrably want to iterate this string post-launch. Marketing-tone copy, customer-visible CTAs, headers visible on entry / booking / listen pages.
- **MEDIUM** — Plausible iteration value, but secondary. Less-trafficked routes, secondary instructional text.
- **LOW** — Engineering-owned. Validation messages, ARIA / a11y text, error-boundary fallbacks, loading spinners.

## Out-of-scope exclusions

- **Email templates** (`src/lib/emails/**`, `src/lib/resend.ts` inlined HTML) — slated for a separate CRM migration path (`Email automation → outsource to a CRM`, CLAUDE.md 2026-05-06). Migrating email body copy to Sanity now is work that gets thrown away when email content management moves to a CRM Becky can manage directly.
- **API route response messages** — server contract strings, not customer copy.
- **Test files** and **dev/debug strings**.

## Summary

- **HIGH** (this branch ships 2 migrations; rest deferred): 5
- **MEDIUM** (deferred to backlog with this doc as carry-over): 5
- **LOW** (stays in code, engineering-owned): 9

---

## HIGH — migrations this branch

| # | File:line | String | Component | Sanity coverage | Action |
|---|-----------|--------|-----------|-----------------|--------|
| H1 | `src/app/book/[readingId]/page.tsx:204` | `Book this Reading →` | Entry-page primary CTA | None | **MIGRATE** — add `bookingPage.bookReadingCtaText` |
| H2 | `src/app/book/[readingId]/page.tsx:159` | `What's included` | Entry-page section header | None | **MIGRATE** — add `bookingPage.whatsIncludedHeading` |

## HIGH — RESOLVED 2026-05-07 in `feat/quality-sweep-projections-copy-types`

| # | Item | Resolution |
|---|------|------------|
| H3 | SubmitOverlay loading state copy | Field was already wired (intake → IntakeForm `loadingStateCopy` prop → SubmitOverlay `text` prop). Production Sanity `bookingForm.loadingStateCopy` value seeded via `scripts/seed-quality-sweep-fields.mts`. No code change. |
| H4 | ContactForm success-state heading + body + button | New schema fields `landingPage.contactSection.{successHeading, successBody, sendAnotherButtonText}` added. ContactForm reads from `content` prop with fallback to `CONTACT_DEFAULTS`. Production seed via the same script. |
| H5 | IntakeForm PageNav labels | `bookingPage.paymentButtonText` wired through intake page → IntakeForm `submitLabel` → PageNav. New fields `bookingForm.nextButtonText` + `bookingForm.saveAndContinueLaterText` added and threaded. PageNav defaults preserved as fallback. |

---

## MEDIUM — RESOLVED 2026-05-07 in `feat/quality-sweep-projections-copy-types`

| # | Item | Resolution |
|---|------|------------|
| M1 | error.tsx — error boundary copy | DROPPED: kept hardcoded. Error boundary fires when render fails; Sanity could be the cause. Build-time bake possible but iteration value vs. complexity tradeoff doesn't justify it. |
| M2 | global-error.tsx — inlined-HTML error fallback | DROPPED: kept hardcoded. Constraint is inherent — global-error.tsx must work even if root layout is broken, so Sanity fetches are unsafe by definition. |
| M3 | Footer LEGAL_LINKS + "Built by Max Gertzen" | DROPPED: Max-owned attribution stays hardcoded by preference. |
| M4 | PageIndicator copy | RESOLVED via H5 bundle. Added `bookingForm.pageIndicatorTagline` optional field that, when set, appends to the counter (`Page 2 of 4 · {tagline}`). Page-counter template itself stays hardcoded. |
| M5 | SwapToast transient copy | DROPPED: `bookingForm.swapToastCopy` was deleted as orphan in `feat/csp-nonce-and-audits`. Re-add only if Becky asks for the iteration. |

---

## LOW — stays in code (engineering-owned)

| # | File:line | String | Why low |
|---|-----------|--------|---------|
| L1 | `src/components/IntakeForm/IntakeForm.tsx:434,450,662` | Form-validation error strings | Engineering-owned, zod / form-control language. |
| L2 | `src/components/IntakeForm/PageNav.tsx:49,57` | `← Back to reading details`, `← Previous page` | Mechanical nav; Becky will not iterate. |
| L3 | `src/components/IntakeForm/PageNav.tsx:81` | `Submitting…` | Loading state. |
| L4 | `src/components/ContactForm/ContactForm.tsx:43-59,88,92` | Validation + error-handling strings | Engineering. |
| L5 | `src/components/NavigationButton/LinkSpinner.tsx:12` | `Loading` | A11y label for spinner. |
| L6 | `src/components/BookingFlowHeader/BookingFlowHeader.tsx:13-14` | `‹ Back`, `About Josephine` | Already passed via prop where customizable. |
| L7 | `src/components/LegalPageLayout/LegalPageLayout.tsx:34` | `Last updated:` | Metadata label. |
| L8 | `src/app/error.tsx:36,39` + `src/app/global-error.tsx:98-101` | `Try Again`, `Return Home` | Error-recovery; engineering-owned. |
| L9 | `src/components/Footer/LegalPageLayout/BackLink.tsx:45` | `Back` | Mechanical nav. |

---

## Cross-cuts surfaced during this audit (fed into separate backlog items)

While auditing, two threads emerged that aren't strictly hardcoded-copy but inform other open work:

1. **Already-migrated strings being verified.** Several apparent "hardcoded" strings turned out to be Sanity-backed `?? "fallback"` patterns — already managed correctly. Examples: `thankYouPage.heading/subheading/closingMessage/returnButtonText`, `notFoundPage.{tag,heading,description,buttonText}`, `siteSettings.consentBanner`, `bookingForm.entryPageContent.*`. No action.

2. **PROJECTED-BUT-UNUSED Sanity fields** — fields in `queries.ts` + `types.ts` but no component reads them. Becky fills them, nothing happens. Caught by the orphan-schema audit (`docs/audits/orphan-schema-fields.md`) as separate backlog. Examples: `bookingPage.emailLabel/emailDisclaimer/paymentButtonText/securityNote`, `bookingForm.{title,intro,description,confirmationMessage,nonRefundableNotice,pagination,loadingStateCopy}` (some wired through prop chain, some not — see audit). The right cleanup is per-field: either wire up where it makes sense, or delete from `queries.ts` + `types.ts` + schema. Backlog item under POST_LAUNCH_BACKLOG → `Audit: orphaned schema fields`.
