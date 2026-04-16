# Phase 4: Sanity CMS Integration Plan

## Context

Phase 3 (page assembly) is complete. All content is hardcoded across ~12 files (~120+ fields). Josephine needs to edit text, prices, testimonials, FAQ, social links, colors, and fonts without touching code. The site uses `output: "export"` (static) and deploys to Hostinger — no serverless runtime available.

## Architecture Decisions

### Studio: Separate package at `/studio/`

`output: "export"` forbids embedding Studio in the Next.js app. Studio deploys independently to `josephine.sanity.studio` (free hosted) via `sanity deploy`.

### Live Preview: Dev server only

`output: "export"` and `draftMode()` are incompatible. Preview works by pointing Studio's Presentation Tool at `localhost:3000` (Josephine runs `pnpm dev` when editing). Production stays fully static — edits trigger webhook rebuild.

### Theme Override: Build-time CSS generation

`scripts/generate-tokens.ts` fetches the `theme` document and writes `tokens.override.css` before `next build`. Cascade: `tokens.css` (defaults) → `tokens.override.css` (Sanity overrides). Fonts: a curated allowlist; build script generates `src/lib/fonts.generated.ts`.

### Build Pipeline

`pnpm build` = `generate-tokens → generate-fonts → next build`. Sanity webhook → GitHub Actions `repository_dispatch` → build → deploy `out/` to Hostinger via SSH.

---

## Schema Design

### `reading` (repeatable)

`name`, `slug` (from name), `tag`, `subtitle`, `price` (number, cents), `priceDisplay` (string, "$179"), `valueProposition`, `briefDescription` (text), `expandedDetails[]` (text array), `includes[]` (string array), `bookingSummary` (text), `requiresBirthChart`, `requiresAkashic`, `requiresQuestions` (booleans), `order` (number), `seo` (object: metaTitle, metaDescription, ogImage)

### `testimonial` (repeatable)

`quote` (text), `name`, `readingType` (reference → reading, optional), `detailOverride` (string fallback), `order`

### `faqItem` (repeatable)

`question`, `answer` (text), `order`

### `landingPage` (singleton)

- `hero`: { tagline, introGreeting, introBody (text), ctaText }
- `about`: { sectionTag, heading, image, paragraphs[] (text array), signoff }
- `howItWorks`: { sectionTag, heading, steps[] (title + description) }
- `readingsSection`: { sectionTag, heading, subheading }
- `testimonialsSection`: { sectionTag, heading }
- `contactSection`: { sectionTag, heading, description, submitText }
- `seo`: { metaTitle, metaDescription, ogImage }

### `bookingPage` (singleton template)

`emailLabel`, `emailDisclaimer`, `paymentButtonText`, `securityNote`, `closingMessage`, `deliveryNote`, `seo`

### `thankYouPage` (singleton template)

`heading`, `subheading`, `steps[]` (icon enum + title + description), `closingMessage`, `returnButtonText`, `seo`

### `siteSettings` (singleton)

`brandName`, `logo` (image), `favicon` (image), `navLinks[]` (label + sectionId), `navCtaText`, `socialLinks[]` (platform enum + url + label), `copyrightText`, `contactEmail`

### `theme` (singleton)

`colors`: { midnight, deep, cream, warm, blush, rose, gold, goldLight, text, muted, ivory } (all color type), `displayFont` (string list: Cormorant Garamond, Playfair Display, EB Garamond, Lora, Crimson Text, Libre Baskerville), `bodyFont` (string list: Inter, DM Sans, Source Sans 3, Nunito Sans, Work Sans)

---

## GROQ Query Layer

New directory: `src/lib/sanity/`

- `client.ts` — Sanity client config (use `apicdn.sanity.io` for build-time reads)
- `queries.ts` — Named GROQ query constants
- `types.ts` — Auto-generated via `sanity-typegen` from schemas
- `fetch.ts` — Typed wrappers: `fetchLandingPage()`, `fetchReadings()`, `fetchReading(slug)`, `fetchSiteSettings()`, `fetchTheme()`, `fetchTestimonials()`, `fetchFaqItems()`

---

## Implementation Phases

### PR #1 — Sanity Foundation

- Create `studio/` with Sanity Studio v3, all 8 schema types
- Singleton pattern via Structure Builder for `landingPage`, `bookingPage`, `thankYouPage`, `siteSettings`, `theme`
- Add `@sanity/client`, `next-sanity` to `www/`
- Create `src/lib/sanity/` (client, queries, types, fetch)
- Migration script: `scripts/seed-sanity.ts` — imports current hardcoded data → creates Sanity documents
- **Verify**: Studio loads, all documents populated, GROQ queries return data

### PR #2 — Landing Page Integration

- Refactor `page.tsx` to fetch from Sanity at build time
- Components accept data props: Hero, HowItWorks, ContactForm, SectionHeading calls, About section, Testimonials
- Navigation + Footer consume `siteSettings`
- `generateMetadata` uses Sanity SEO fields
- Remove hardcoded content from `readings.ts` (keep types/helpers)
- **Verify**: `pnpm build` produces identical output to current site

### PR #3 — Dynamic Pages Integration

- `book/[readingId]` and `thank-you/[readingId]` fetch from Sanity
- `generateStaticParams` queries Sanity for all reading slugs
- Adding a reading in Studio → new pages on rebuild
- **Verify**: add test reading in Studio, rebuild, confirm new `/book/[slug]` exists

### PR #4 — FAQ Section + Social Links

- New `FAQ` component (accordion, `bg-j-ivory` cards)
- Add between Testimonials and Contact on landing page
- JSON-LD `FAQPage` structured data for SEO
- Update Footer with social link icons from `siteSettings`
- **Verify**: FAQ renders from Sanity, social icons link correctly

### PR #5 — Theme Pipeline

- `scripts/generate-tokens.ts` — fetch `theme` → write `tokens.override.css`
- `scripts/generate-fonts.ts` — write `src/lib/fonts.generated.ts`
- Update `globals.css` import chain and `layout.tsx` font loading
- Build script: `"build": "pnpm generate-tokens && pnpm generate-fonts && next build"`
- **Verify**: change color in Studio → rebuild → CSS vars updated in output

### PR #6 — Preview + Deploy Pipeline

- Configure Presentation Tool pointing at `localhost:3000`
- GitHub Actions: Sanity webhook → `repository_dispatch` → build → SSH deploy to Hostinger
- `sanity deploy` script for Studio hosting
- Document Josephine's editing workflow
- **Verify**: end-to-end edit → publish → live site updated

---

## Critical Files

| File                                         | Change                                    |
| -------------------------------------------- | ----------------------------------------- |
| `src/app/page.tsx`                           | Fetch Sanity data, pass props to sections |
| `src/app/layout.tsx`                         | Dynamic fonts, siteSettings metadata      |
| `src/data/readings.ts`                       | Replaced by Sanity queries (keep types)   |
| `src/styles/tokens.css`                      | Defaults, overridden by generated CSS     |
| `src/components/Hero/Hero.tsx`               | Accept content props                      |
| `src/components/HowItWorks/HowItWorks.tsx`   | Accept content props                      |
| `src/components/Navigation/Navigation.tsx`   | Accept siteSettings props                 |
| `src/components/Footer/Footer.tsx`           | Accept siteSettings + social links        |
| `src/components/ContactForm/ContactForm.tsx` | Accept content props                      |
| `src/app/book/[readingId]/page.tsx`          | Fetch reading by slug from Sanity         |
| `src/app/thank-you/[readingId]/page.tsx`     | Fetch reading by slug from Sanity         |

## Key Constraints

- **Slug migration**: Sanity slugs must match current IDs (`soul-blueprint`, `birth-chart`, `akashic-record`) to preserve URLs
- **Free tier**: Static builds make ~10 queries per build — well under 100K/month
- **Incremental adoption**: Components fall back to hardcoded defaults if Sanity data is null during transition
- **Image handling**: `images.unoptimized: true` already set — Sanity image URLs work directly
