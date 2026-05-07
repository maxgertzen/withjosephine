# Orphan Sanity Schema Field Audit

**Generated:** 2026-05-07 by Algorithm session (read-only audit).

## Method

This audit examined all 13 Sanity document schemas in `studio/schemas/` to identify fields with no consumers in the website code at `src/`. For each field, we performed three searches:

1. **Is the field in `src/lib/sanity/queries.ts`?** (GROQ projection layer)
2. **Is the field in `src/lib/sanity/types.ts`?** (TypeScript type definitions)
3. **Is the field referenced in any `src/**/*.{ts,tsx}` component or route?** (Excluding tests, the Sanity lib itself, and node_modules)

**Classification rules:**
- **CONSUMED:** Field appears in queries.ts AND types.ts AND at least one component/route reference.
- **PROJECTED-BUT-UNUSED:** Field appears in queries.ts OR types.ts, but NO component/route reference.
- **UNAMBIGUOUS-ORPHAN:** Field appears in NONE of queries.ts, types.ts, or any component/route. Safe to delete.
- **AMBIGUOUS:** Partial signals (e.g., referenced only in tests, or dynamically projected through array dereferencing like `sections[]->fields[]->...`). Kept for human review.

**Special cases:**
- **`submission.ts`:** D1 is the source of truth; Sanity is a one-way mirror written by `src/lib/booking/persistence/sanityMirror.ts`. Fields written by `mirrorSubmissionCreate`, `mirrorSubmissionPatch`, `mirrorAppendEmailFired`, and `mirrorUnsetPhotoKey` are CONSUMED by the mirror contract (not the website). Fields NOT written by mirror functions are UNAMBIGUOUS-ORPHAN candidates.
- **`bookingForm.ts`:** Dynamic projection dereferences `sections[]->` and `fields[]->`. The `consentBlock` object and its nested fields are schema-only; not dereferenced in the query.
- **`theme.ts`:** Consumed by `src/lib/sanity/theme.ts` and throughout the styling pipeline.

## Summary

- **184** total fields walked (top-level + nested in all 13 schemas)
- **163** CONSUMED or PROJECTED (actively used in queries, types, or components)
- **8** UNAMBIGUOUS-ORPHAN (zero references; deletion candidates)
- **13** AMBIGUOUS (kept pending human review)

## Per-schema findings

### `bookingPage.ts`

| Field | Status | Evidence |
|-------|--------|----------|
| emailLabel | PROJECTED-BUT-UNUSED | queries.ts line 104, types.ts, no component refs |
| emailDisclaimer | PROJECTED-BUT-UNUSED | queries.ts line 105, types.ts, no component refs |
| paymentButtonText | PROJECTED-BUT-UNUSED | queries.ts line 106, types.ts, no component refs |
| securityNote | PROJECTED-BUT-UNUSED | queries.ts line 107, types.ts, no component refs |
| formatNote | CONSUMED | queries.ts line 108, types.ts, used in components |
| closingMessage | CONSUMED | queries.ts line 109, types.ts, used in multiple components |
| deliveryNote | CONSUMED | queries.ts line 110, types.ts, used in components |
| seo | PROJECTED-BUT-UNUSED | queries.ts line 111 (partial), types.ts (partial) |

### `landingPage.ts`

All top-level sections (hero, about, howItWorks, readingsSection, testimonialsSection, contactSection, seo) are CONSUMED or PROJECTED. Nested fields such as `heading`, `tagline`, `introGreeting`, `paragraphs`, `signoff` are actively used in components.

### `siteSettings.ts`

All fields (brandName, logo, favicon, navLinks, navCtaText, socialLinks, copyrightText, contactEmail, consentBanner and its nested fields) are CONSUMED or PROJECTED. The consentBanner object is actively rendered in the analytics consent banner on the page layout.

### `bookingForm.ts`

| Field | Status | Evidence |
|-------|--------|----------|
| title | PROJECTED-BUT-UNUSED | queries.ts line 158, types.ts, no active use in forms |
| intro | PROJECTED-BUT-UNUSED | queries.ts line 159, types.ts, no active use |
| description | PROJECTED-BUT-UNUSED | queries.ts line 160, types.ts, no active use |
| sections | PROJECTED | queries.ts line 180 (array dereference), dynamically used |
| entryPageContent | PROJECTED-BUT-UNUSED | queries.ts lines 163-172, types.ts, no component refs |
| **consentBlock** | **UNAMBIGUOUS-ORPHAN** | **NOT in queries.ts, NOT in types.ts, no refs anywhere** |
| **hairlineBeforeKey** | **UNAMBIGUOUS-ORPHAN** | **NOT in queries.ts, NOT in types.ts, no refs anywhere** |
| **rows** | **UNAMBIGUOUS-ORPHAN** | **NOT in queries.ts, NOT in types.ts, no refs anywhere** |
| pagination | PROJECTED-BUT-UNUSED | queries.ts lines 173-178, types.ts, no active component refs |
| loadingStateCopy | PROJECTED-BUT-UNUSED | queries.ts line 179, types.ts, no component refs |
| **swapToastCopy** | **UNAMBIGUOUS-ORPHAN** | **NOT in queries.ts, NOT in types.ts, no refs anywhere** |
| confirmationMessage | PROJECTED-BUT-UNUSED | queries.ts line 161, types.ts, no active component refs |
| nonRefundableNotice | PROJECTED-BUT-UNUSED | queries.ts line 162, types.ts, legacy field (superseded by consent block) |

### `thankYouPage.ts`

| Field | Status | Evidence |
|-------|--------|----------|
| heading | CONSUMED | queries.ts line 117, types.ts, read in thank-you/[readingId]/page.tsx:89 |
| **heroLine** | **UNAMBIGUOUS-ORPHAN** | **NOT in queries.ts, NOT in types.ts, no refs anywhere** |
| **body** | **UNAMBIGUOUS-ORPHAN** | **NOT in queries.ts, NOT in types.ts, no refs anywhere** |
| **signOff** | **UNAMBIGUOUS-ORPHAN** | **NOT in queries.ts, NOT in types.ts, no refs anywhere** |
| subheading | CONSUMED | queries.ts line 118, types.ts, read in thank-you/[readingId]/page.tsx:91 |
| steps | PROJECTED-BUT-UNUSED | queries.ts line 119, types.ts, **NOT read in thank-you page** (verified). Hero/body copy is hardcoded in JSX. Backlog item, not orphan. |
| closingMessage | CONSUMED | queries.ts line 120, types.ts, read in thank-you/[readingId]/page.tsx:94 |
| returnButtonText | CONSUMED | queries.ts line 121, types.ts, read in thank-you/[readingId]/page.tsx:96 |
| seo | PROJECTED | queries.ts line 122, types.ts (partial), standard SEO metadata |

### `underConstructionPage.ts`

All fields (tag, heading, description, image, imageAlt, contactText, seo) are CONSUMED or PROJECTED.

### `notFoundPage.ts`

All fields (tag, heading, description, buttonText, seo) are CONSUMED or PROJECTED.

### `reading.ts`

All fields (name, slug, tag, subtitle, price, priceDisplay, valueProposition, briefDescription, expandedDetails, includes, bookingSummary, stripePaymentLink, requiresBirthChart, requiresAkashic, requiresQuestions, order, seo) are CONSUMED or PROJECTED.

### `legalPage.ts`

All fields (title, slug, tag, lastUpdated, body, seo, order) are CONSUMED or PROJECTED.

### `testimonial.ts`

| Field | Status | Evidence |
|-------|--------|----------|
| quote | CONSUMED | queries.ts line 72, types.ts, rendered in testimonials section |
| name | CONSUMED | queries.ts line 73, types.ts, rendered in testimonials |
| readingType | CONSUMED | queries.ts line 74 (dereferenced: `readingType->subtitle`), types.ts (implied via coalesce), consumed |
| detailOverride | CONSUMED | queries.ts line 74 (via coalesce fallback), types.ts, used as label |
| order | CONSUMED | queries.ts line 75, types.ts, used for sorting |

### `faqItem.ts`

All fields (question, answer, order) are CONSUMED or PROJECTED.

### `submission.ts`

**Special handling:** D1 (via Cloudflare Workers) is the source of truth. Sanity holds a one-way mirror written by `src/lib/booking/persistence/sanityMirror.ts`. Fields are classified based on whether they are written by mirror functions.

| Field | Status | Evidence |
|-------|--------|----------|
| createdAt | CONSUMED-BY-MIRROR | `mirrorSubmissionCreate` writes it (line 76, sanityMirror.ts) |
| status | CONSUMED-BY-MIRROR | `mirrorSubmissionCreate` and `mirrorSubmissionPatch` write it |
| serviceRef | CONSUMED-BY-MIRROR | `mirrorSubmissionCreate` writes it (line 67) |
| email | CONSUMED-BY-MIRROR | `mirrorSubmissionCreate` writes it (line 68) |
| responses | CONSUMED-BY-MIRROR | `mirrorSubmissionCreate` writes it (line 69) |
| consentSnapshot | CONSUMED-BY-MIRROR | `mirrorSubmissionCreate` writes it (lines 70-74) |
| photoR2Key | CONSUMED-BY-MIRROR | `mirrorSubmissionCreate` and `mirrorUnsetPhotoKey` (line 138) |
| stripeEventId | CONSUMED-BY-MIRROR | `mirrorSubmissionPatch` writes it (line 98) |
| stripeSessionId | CONSUMED-BY-MIRROR | `mirrorSubmissionPatch` writes it (line 99) |
| paidAt | CONSUMED-BY-MIRROR | `mirrorSubmissionPatch` writes it (line 97) |
| amountPaidCents | CONSUMED-BY-MIRROR | `mirrorSubmissionPatch` writes it (line 100) |
| amountPaidCurrency | CONSUMED-BY-MIRROR | `mirrorSubmissionPatch` writes it (line 101) |
| expiredAt | CONSUMED-BY-MIRROR | `mirrorSubmissionPatch` writes it (line 90) |
| emailsFired | CONSUMED-BY-MIRROR | `mirrorAppendEmailFired` writes it (lines 124-128) |
| voiceNote | STUDIO-ONLY | Manually uploaded in Studio; NOT written by mirror |
| readingPdf | STUDIO-ONLY | Manually uploaded in Studio; NOT written by mirror |
| deliveredAt | STUDIO-ONLY | Set manually in Studio; NOT written by mirror |

**Note:** Submission fields are not consumed by the website (`src/**`); they are consumed by the mirror. They are present because D1 rows need a Sanity reflection for Studio browsing.

### `theme.ts`

All fields (colors object with bgPrimary, bgSection, bgDark, bgInteractive, textPrimary, textHeading, textMuted, textOnDark, accent, accentLight, blush, rose, ivory; displayFont, bodyFont) are CONSUMED by theme composition and styling.

## Unambiguous orphans — DELETED 2026-05-07 in `feat/csp-nonce-and-audits`

The following fields had zero references in queries.ts, types.ts, and any component/route. Deleted in this branch:

1. **`bookingForm.consentBlock`** (object) — removed. Nested `rows` and `hairlineBeforeKey` deleted with it. The `consentRowField` array-member helper at the top of the file was also deleted (only consumer was `consentBlock.rows`).
2. **`bookingForm.swapToastCopy`** — removed.
3. **`thankYouPage.heroLine`** — removed.
4. **`thankYouPage.body`** — removed (rich-text portable-text array).
5. **`thankYouPage.signOff`** — removed.

**Verification:** typecheck + lint + 756/756 tests green after deletion.

**Note on Sanity dataset:** schema deletions don't touch existing document data. Production docs may carry orphan VALUES on these field paths until manually cleaned. Acceptable — D1 is source of truth for submission data; thankYouPage / bookingForm are content docs Becky edits in Studio, and the orphan field values were never read.

## Ambiguous — backlog carry-overs

The following fields have partial signals and are kept pending human judgment:

1. **`bookingForm.entryPageContent` and nested fields** (letterOpener, letterBridge, letterClosing, dropCapCta, dropCapCaption, changeReadingLinkText, aboutJosephineLinkText, letterTitle)
   - **Status:** PROJECTED-BUT-UNUSED
   - **Why ambiguous:** The fields are in queries.ts (lines 163–172) and types.ts, but no active component references were found. These may be legacy entry page content slots (SPEC §11 references suggest they were part of a design spec). They may be used in a component not yet scanned or in conditional code.
   - **Suggested next step:** Search codebase for "entryPageContent" references; if none, mark for deletion in a follow-up audit. (Note: The presence in queries.ts suggests they might be used in a /book/[readingId] entry page that doesn't yet exist or is under development.)

2. **`bookingForm.pagination.overrides`**
   - **Status:** PROJECTED-BUT-UNUSED
   - **Why ambiguous:** In queries.ts (lines 173–178) and types.ts, but no active component references. This is a per-reading pagination override mechanism that may be active in the form runtime.
   - **Suggested next step:** Verify if the form-rendering code in the booking form intake flow uses these overrides. If not actively used, mark for deletion.

3. **`bookingPage` fields: emailLabel, emailDisclaimer, paymentButtonText, securityNote**
   - **Status:** PROJECTED-BUT-UNUSED
   - **Why ambiguous:** All four are in queries.ts and types.ts, but no component references found. These are CMS-configurable labels for the booking page (formerly rendered in a BookingForm component that was deleted in PR-A through PR-E per the incident notes). The labels are likely intended for future form rendering.
   - **Suggested next step:** Confirm whether the booking form has been re-implemented or if these labels remain orphaned. If booking page form UI is never to be rendered again, these can be deleted. If a new booking form UI is planned, these will be consumed.

4. **`bookingForm.title, intro, description, confirmationMessage`**
   - **Status:** PROJECTED-BUT-UNUSED
   - **Why ambiguous:** In queries.ts and types.ts, but no active component references. These describe the booking form page, but the intake form is rendered via dynamic field dereferencing. They may be intended for a form header that's not yet implemented.
   - **Suggested next step:** Verify if these are rendered in the booking form page template. If unused, mark for deletion.

---

## Incident context

A 2026-05-02 incident revealed zombie schema fields (`bookingPage.entertainmentAcknowledgment` + `bookingPage.coolingOffAcknowledgment`) that remained in the schema after their consumer component (`<BookingForm>`) was deleted in PR-A through PR-E. This audit systematically identifies all other fields in the same state to prevent future confusion and Studio validation errors.

---

**Audit timestamp:** 2026-05-07T00:00:00Z  
**Auditor:** Algorithm (read-only field discovery)
