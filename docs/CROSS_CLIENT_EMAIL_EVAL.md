# Cross-client email testing — evaluation

Decision artifact for dex `47w420v0`. Captures the trade-off between adding a
cross-client preview vendor (Litmus / Email-On-Acid / etc.) now vs deferring
until a customer reports a client-specific render bug.

## Why this question exists

The Sanity Studio iframe-pane preview (`StudioEmailPreview`) renders React
Email through Chromium. The Studio send-to-test action (PR-6 / `cfor9w5f`)
delivers a real send to Gmail/Apple Mail/Outlook inbox of Max's choosing. Both
catch a lot — copy errors, broken images, layout collapse, slot-validation
failures.

Neither catches everything. Email clients diverge dramatically on:

- **Outlook desktop (Windows Word renderer)** — VML for rounded buttons,
  no flexbox-gap, table layout only, partial CSS3, no custom properties.
- **Gmail mobile / iOS Mail dark mode** — auto-inverts light backgrounds,
  often inverting brand assets too. CSS `prefers-color-scheme` partially
  honored, partially not.
- **Yahoo / AOL / older clients** — strip more CSS, no media queries.
- **Apple Mail dark mode** — different inversion rules than iOS Mail; brand
  assets sometimes inverted, sometimes preserved.

React Email's templates are already table-based and conservative on CSS,
which mitigates a lot of the risk. The remaining surface is brand fidelity
(cream/midnight/gold tokens) under dark-mode inversion, and Outlook desktop's
distinctive button rendering. Both surface as "this email is ugly in client X"
when a customer reports it.

## Vendors evaluated

> **Pricing is approximate and was not freshly verified for this eval.** The
> vendors keep their published pricing reasonably current; check
> [litmus.com/pricing](https://litmus.com/pricing) and
> [emailonacid.com/pricing](https://www.emailonacid.com/pricing) before
> committing budget. Structural recommendation below does not depend on the
> exact dollar figure.

### 1. Litmus

Industry incumbent (founded 2005). Standard reference for cross-client
preview in e-commerce, SaaS, and editorial newsletters.

- **Coverage:** 90+ client+device combinations per render. Includes Outlook
  2016/2019/365/desktop variants, Gmail web/iOS/Android, Apple Mail
  iOS/macOS light+dark, Yahoo, AOL, Samsung Mail, Thunderbird.
- **Pricing:** Basic plan historically ~$99/mo for ~25 previews/mo + dark-mode
  testing. Higher tiers add accessibility scans, brand-asset diff, spam
  filter checks (~$300+/mo).
- **Integration:** API + SDK (Node/Python) for CI render-and-check. Manual
  upload-HTML also available. We could wire an API call after each Sanity
  publish; not load-bearing for v1.5.0.
- **Verdict:** Best coverage. Most expensive. Worth it past ~50 customers/mo
  or when a render bug has already cost trust.

### 2. Email-On-Acid (Sinch Email)

Direct Litmus competitor, acquired by Sinch in 2022. Similar feature set,
historically priced ~20% lower.

- **Coverage:** 70+ client+device combinations. Outlook desktop coverage
  on par with Litmus. Gmail / Apple Mail dark mode covered.
- **Pricing:** Starter ~$74/mo for ~25 previews + dark mode. Pro adds
  campaign analytics + spam checks.
- **Integration:** API + Zapier. Comparable Node ergonomics.
- **Verdict:** Litmus-equivalent at lower cost. Better for an early-stage
  practice; coverage gap (70 vs 90 clients) is mostly long-tail clients
  that don't materially affect Josephine's audience.

### 3. Resend's built-in preview

Resend's dashboard renders sent emails in a basic preview. As of 2026 it
does NOT offer cross-client previews — only the raw HTML rendered in a
browser frame. Same blind spot as the Studio iframe.

- **Coverage:** Browser-only render. No Outlook desktop, no dark-mode
  diff, no client-specific shims.
- **Pricing:** Free (bundled with Resend).
- **Integration:** None needed — Resend dashboard surfaces it for any
  delivered message.
- **Verdict:** Useful for "did the send actually happen" smoke, not for
  cross-client validation.

### 4. Mailchimp Inbox Inspector

Built into Mailchimp's campaign tooling. Historically required a Mailchimp
account; reduced standalone access since 2023 acquisition shuffle.

- **Coverage:** ~40 clients. Decent Outlook coverage; lighter on Apple Mail
  dark mode variants.
- **Pricing:** Free at low volumes (24 tests/month with paid Mailchimp);
  not standalone.
- **Integration:** Inside Mailchimp UI only. No API for our pipeline.
- **Verdict:** Disqualified — we aren't on Mailchimp and don't intend to be.

### 5. Preprocessing — Premailer, juice, html-email-comb

CSS preprocessing tools, not preview vendors. They flatten / inline /
strip CSS to maximize compatibility BEFORE the email lands in an inbox.

- **Premailer:** CSS-to-inline-style + Outlook conditional fallbacks. Ruby
  origin, Node ports exist. Solves the "client strips `<style>`" class of
  bug.
- **juice:** Node-native inliner; widely used by React Email itself
  internally (`@react-email/render` already inlines).
- **html-email-comb:** Strips unused CSS at build time. Reduces payload + a
  class of weird-CSS-broke-something bugs.
- **Pricing:** Free (npm packages).
- **Integration:** Build-step. Could wire into `render()` if profiling shows
  payload is a problem (it currently isn't).
- **Verdict:** Already largely covered by React Email's render path. No new
  vendor needed; revisit only if payload size or unused-CSS becomes a real
  signal.

## Decision criteria summary

| Criterion | Litmus | Email-On-Acid | Resend native | Mailchimp | Preprocessing |
|---|---|---|---|---|---|
| Coverage breadth | 90+ | 70+ | 1 (browser) | ~40 | n/a (build-step) |
| Outlook desktop | ✅ all variants | ✅ all variants | ❌ | ✅ partial | ⚠️ partial mitigation |
| Apple Mail dark | ✅ all variants | ✅ | ❌ | ⚠️ partial | ❌ |
| Cost / mo | ~$99–$300+ | ~$74–$200+ | $0 (bundled) | bundled w/ MC | $0 (npm) |
| API integration | ✅ first-class | ✅ first-class | n/a | ❌ no API | n/a (build-step) |
| Setup time | ~1 day | ~1 day | 0 | n/a | ~half day |
| Verdict for Josephine | best, overkill | best fit if adopting | sanity check only | disqualified | already covered |

## Recommendation: **defer with explicit trigger**

**Do not adopt a cross-client vendor for v1.5.0.** Justification:

1. **Scale doesn't justify spend yet.** At ~10 customers/month launch volume
   (per `47w420v0` task), $74–99/mo is 10–14% of gross revenue. The
   render-bug expected-value at this scale is well below the subscription.
2. **The Studio send-to-test action** (`cfor9w5f`, shipping in PR-6) covers
   Max's primary inbox (Gmail) + Becky's review address. That's the
   ~80% case for Josephine's audience (Gmail + Apple Mail mobile dominate
   personal-spirituality demographics).
3. **React Email's table-based render** is already conservative — the
   templates don't use flexbox-gap, custom properties without fallbacks, or
   complex media queries. Outlook desktop rendering is therefore mostly fine
   out of the box.
4. **No reported render incidents to date.** Adopting a vendor pre-incident
   is buying insurance against a hypothetical.

**Promotion trigger: adopt Email-On-Acid Starter (~$74/mo) when ANY of the
following hits:**

- ≥1 customer report of a client-specific render bug (Outlook, Yahoo, dark
  mode, etc.) in a 30-day window. One report = noise; two = signal.
- Monthly send volume crosses ~100 customer emails (each render bug now
  hits 10+ inboxes before catching it via the send-to-test pattern).
- A new template added that uses non-trivial CSS — animated gradients,
  flexbox-gap, custom layouts. Pre-merge cross-client check is cheaper than
  post-merge customer complaint.
- A redesign / brand refresh changes the visual signature meaningfully.
  Cross-client validation should gate that release.

When the trigger fires: pick Email-On-Acid Starter over Litmus (~25% cheaper,
same coverage for our client mix); wire a one-shot manual upload-HTML
workflow first; only add an API integration if a second template churn cycle
proves the manual flow is the bottleneck.

## Status

- **Decision:** defer.
- **Trigger:** see above.
- **Next action:** none. Re-open this doc when the trigger fires.

Refs `47w420v0`.
