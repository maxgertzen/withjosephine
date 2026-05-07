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

## HIGH — deferred to backlog

| # | File:line | String | Component | Sanity coverage | Why deferred |
|---|-----------|--------|-----------|-----------------|--------------|
| H3 | `src/components/IntakeForm/SubmitOverlay.tsx:5` | `One moment — taking you to checkout.` | IntakeForm submission overlay | `bookingForm.loadingStateCopy` (PROJECTED, IS wired through IntakeForm prop chain — verified at IntakeForm.tsx:542). Ships unedited because Sanity doc may not have a value seeded; defaulting to hardcoded. | Wire-up needs Sanity dataset seed migration to take effect. Defer to a focused "seed + wire" pass. |
| H4 | `src/components/ContactForm/ContactForm.tsx:102-108` | `message sent` (heading), `Thank you for reaching out. I'll get back to you as soon as I can.` (body), `Send another message` (button) | Contact form success state | None | Schema-add work plus ContactForm prop-threading. Worthwhile but doesn't fit this branch's scope. |
| H5 | `src/components/IntakeForm/PageNav.tsx:33-35` | `Continue to payment →`, `Next →`, `Save and continue later` | IntakeForm page-nav buttons | `bookingPage.paymentButtonText` exists (PROJECTED-BUT-UNUSED). `Next` / `Save and continue` have no schema. | Wire-up + 2 new fields. Defer to a focused "intake-form copy" pass. |

---

## MEDIUM — deferred to backlog

| # | File:line | String | Component | Sanity coverage | Why deferred |
|---|-----------|--------|-----------|-----------------|--------------|
| M1 | `src/app/error.tsx:24,28,32` | `✦ Something Went Wrong`, `an unexpected error occurred`, `We're sorry for the inconvenience...` | Route error boundary | None | Error boundary copy is engineering-adjacent; iteration value is real but lower-priority than primary funnel copy. |
| M2 | `src/app/global-error.tsx:92-95` | `✦ Something Went Wrong`, `an unexpected error occurred` (inlined HTML version) | Global error boundary | None | Same as M1, plus inlined-HTML constraint — global-error.tsx must work even if root layout is broken, so Sanity fetches there are unsafe. Use a build-time bake or accept hardcoded. |
| M3 | `src/components/Footer/Footer.tsx:25-29` | `LEGAL_LINKS` labels + `Built by Max Gertzen` | Footer | Legal labels (`Privacy`, `Terms`, `Refunds`) hardcoded; `Built by Max Gertzen` is Max-owned attribution. | Low Becky-iteration value; `Built by Max` should stay hardcoded by Max preference. |
| M4 | `src/components/IntakeForm/PageIndicator.tsx:40` | `Page {n} of {n}`, `One short page` | IntakeForm page indicator | None | Mostly mechanical; iteration value is low-medium. Bundle with H5 if/when intake copy gets a focused pass. |
| M5 | `src/components/IntakeForm/SwapToast.tsx:14` | `Switched to {readingName}. Your name and email are saved — start where you left off.` | Reading-swap transient toast | Was previously held in `bookingForm.swapToastCopy` but that schema field was deleted in this branch's orphan-audit pass (zero consumers). | Transient toast — low Becky-iteration value. Re-add the schema field only if Becky asks. |

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
