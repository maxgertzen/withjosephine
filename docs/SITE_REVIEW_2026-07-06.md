# Site Quality Review — 2026-07-06 (SEO / Accessibility / Performance)

Read-only audit of live `withjosephine.com` (three parallel reviewers + orchestrator verification). Every headline claim below was re-verified first-hand by curl, grep, or computed WCAG math before filing. Task tracking: dex epic `dwiyj3bi`. The hero first-paint blink was fixed separately (PR #323, dex `vcgpmu7n`).

Robots.ts items are deliberately excluded: a separate session owns robots changes; the Google-Extended tradeoff is banked for that review.

## SEO

### HIGH
| Finding | Evidence | Fix | dex |
|---|---|---|---|
| Meta titles advertise wrong prices | `/book/birth-chart` title `— $99`, page shows $89; `/book/akashic-record` title `— $79`, page shows $89 (verified live) | Prod Sanity `reading.seo.metaTitle` for both readings (consumed `src/app/book/[readingId]/page.tsx:31`), or template from live price field | `6m832mxc` |
| No OG/Twitter cards on any page | 0 `og:*`/`twitter:*` in served HTML site-wide; `buildOpenGraph` (`src/lib/seoMetadata.ts:5-9`) returns undefined without Sanity ogImage (none uploaded), never emits title/url/type/siteName/card | Root `metadata` export in `layout.tsx` (default openGraph + twitter `summary_large_image`), static `src/app/opengraph-image.png`, complete `buildOpenGraph` with fallbacks | `0be0yeig` |
| No `metadataBase`, no canonicals | zero `<link rel=canonical>` live; root layout exports no metadata | `metadataBase: new URL("https://withjosephine.com")` + per-route `alternates.canonical` | `0be0yeig` |
| www subdomain dead | `https://www.withjosephine.com/` → HTTP 522, no redirect (verified) | CF dashboard: www→apex 301; also enable Always Use HTTPS (`http://` apex currently serves 200 directly, no HSTS) | `kqpx4aey` (Max) |

### MED
- No `sitemap.xml` (404; no `src/app/sitemap.ts`). Add home + 3 legal + 3 book slugs; exclude letter/intake/private. `sitemap:` field in robots.ts waits for robots-session coordination. → `pmeqletx`
- Book pages have zero structured data (home has a valid 14-item FAQPage JSON-LD). Add Product/Service + Offer (price/USD/availability) per book page; Organization/Person + WebSite in root layout. → `pmeqletx`

### LOW (banked with robots review)
- `/preview/`, `/privacy/export` not robots-disallowed (both already `noindex,nofollow`, crawl-budget only).
- CF "Managed robots.txt" prepends duplicate bot rules; harmless, awareness only.
- Google-Extended policy decision (Gemini citations + training are one flag) — Max's call, in-flight branch exists.

### Healthy
Unique well-sized titles/descriptions on all public pages; single h1 + clean heading order; valid FAQPage JSON-LD; correct 404/200/308 status behavior; private surfaces (`/listen`, `/thank-you`, `/preview`, `/privacy/export`, `/book/*/letter`) all noindexed; content fully server-rendered (keywords present without JS); `lang="en"`, favicons linked.

## Accessibility

### HIGH
| Finding | Evidence | Fix | dex |
|---|---|---|---|
| Gold `#C4A46B` on light backgrounds fails contrast systemically | 2.23:1 on cream (verified math; fails even the 3:1 large-text bar). Carries info: section eyebrows (`SectionHeading.tsx:23`), reading **prices** + tags (`ReadingCard.tsx:56,48`), hero tagline, eyebrows on booking/legal/error/404/UC views | Darker text-gold token (~`#8A6D3B` ≈4.5:1 on cream) for text roles; keep `#C4A46B` decorative + on dark (7–8:1 fine). **Brand-sensitive: Max/Designer decision first** | `gk2etjdy` |
| Floated form labels turn gold when filled | `formStyles.ts:8` floated state `text-j-accent` ≈2.23:1 at ~11px, every intake/contact field | Floated state → `--j-text-muted`/`--j-text` | `gk2etjdy` |
| Focus indicator fails 3:1 on light pages | all controls `focus-visible:outline-j-accent` (`Button.tsx:9-15`) = 2.23:1 on cream | Focus ring → `--j-deep` (#1C1935, ~16:1) | `gk2etjdy` |
| Home page: no `<main>` landmark, no skip link site-wide | 0 `<main>` in live home HTML (`HomePageView.tsx:55-164`); sub-pages do it right | Wrap home in `<main>`, skip link in root layout; also error/404/UC views | `xag4q56p` |

### MED
- `prefers-reduced-motion` doesn't stop looping animations: `j-animate-twinkle` (StarField ×30), `j-animate-glow` (CelestialOrb) missing from the reduce block; FAQ/ReadingCard height animations unguarded (hook exists, wire it). → `qiiqqs0a`
- Mobile nav overlay: closed = `aria-hidden` but still tabbable (use `hidden`/`inert`); open = no focus trap/Escape/restore. → `qiiqqs0a`
- Hamburger touch target ~24px (pad to 44px like `BookingFlowHeader`). → `qiiqqs0a`
- FAQ region `aria-labelledby` points to a nonexistent id (`FaqSection.tsx:84` vs `:69`). → `qiiqqs0a`
- Muted `#7A6F6A` on warm = 4.30:1 (verified; testimonial detail); rose `#BF9B8B` on cream = 2.39:1 (letter intro, discard button). → `gk2etjdy`

### LOW
ReadingCard `aria-expanded` without `aria-controls`; ContactForm shared error not tied to fields via `aria-describedby`/`aria-invalid`; redundant nested nav landmarks; input focus relies on the low-contrast gold border. → `qiiqqs0a`

### Healthy
Reusable `Input`/`FieldShell` are genuinely strong (labels, `aria-invalid`, `aria-describedby`, `role=alert`, autocomplete); ContactForm `noValidate` + honeypot correct; body/heading contrast on light and dark passes (10–18:1); decorative SVGs `aria-hidden`; ConsentBanner is a proper labeled dialog; FAQ buttons have correct expanded/controls wiring; heading order clean.

## Performance

### HIGH
| Finding | Evidence | Fix | dex |
|---|---|---|---|
| Mixpanel (~120KB brotli) in initial JS, pre-consent | top-level import at `src/lib/analytics/client.ts:3` (verified) drags mixpanel-browser into the first-paint bundle; largest chunk 414KB raw / 120KB br; init only runs post-consent and a pre-init queue already exists | `await import("mixpanel-browser")` inside `initAnalytics()` | `exkalv00` |
| Static assets never browser-cache | hashed `/_next/static/*` JS, fonts, `/images/*` all serve `cache-control: max-age=0, must-revalidate` (verified); `public/_headers` has security headers only | `_headers`: `/_next/static/*` → `max-age=31536000, immutable`; `/images/*` → `max-age=604800` | `wqwqx0hm` |

### MED / LOW
- Total initial JS ~430KB br across 18 chunks; framer-motion ~160KB is the next lever after mixpanel (scope to FAQ/ReadingCard or CSS). → `0nge4vbb`
- `/book/*` observed `x-nextjs-cache: STALE`, effective `s-maxage=2`, TTFB spikes ~1.4s on revalidation; confirm the revalidate window (expected 60–300s). → `0nge4vbb`
- Both horizontal logo variants preloaded, each hidden per breakpoint (~8KB waste): media attr or drop one preload. → `0nge4vbb`
- `logo-main.webp` 53KB at 960×960, rendered ~150–280px on phones; it's the LCP candidate: smaller intrinsic or srcset. → `0nge4vbb`

### Healthy
Home HTML genuinely edge-cached (cf-cache HIT + prerender, 16KB br); brotli everywhere; fonts self-hosted via `next/font` (preloaded, non-blocking); analytics/Sentry/Clarity correctly consent + prod-host gated, nothing third-party render-blocking; no image CLS (dimensions + lazy below fold); CSS tiny; static-vs-dynamic route split correct.

## Fix plan (waves)

- **Wave 0 — now, Max-gated:** merge PR #323 (hero) after Max's check → deployed probe + bookkeeping. Max in CF dashboard: www→apex 301 + Always Use HTTPS (`kqpx4aey`). Sanity metaTitle price fix (`6m832mxc`, content-only, propagates via ISR).
- **Wave 1 — quick code wins, one PR:** mixpanel dynamic import (`exkalv00`), `_headers` caching (`wqwqx0hm`), `<main>` + skip link (`xag4q56p`), mechanical a11y bits (FAQ id, reduced-motion additions).
- **Wave 2 — SEO foundation, one PR:** OG/Twitter/metadataBase/canonicals + OG image (`0be0yeig`), sitemap + JSON-LD (`pmeqletx`). Robots.ts touches coordinate with the robots session.
- **Wave 3 — design-gated + polish:** gold contrast system after Max/Designer pick the text-gold (`gk2etjdy`); nav overlay focus work (`qiiqqs0a` rest); perf polish bundle (`0nge4vbb`).
