# Mixpanel Funnels — operating guide

How to set up and read funnels for the booking flow. This is the
quantitative side of analytics; for qualitative ("why did THIS
visitor bounce") see Microsoft Clarity (Phase-2 add, see
`POST_LAUNCH_BACKLOG.md`).

---

## What a funnel is

A funnel is an ordered sequence of events Mixpanel watches per visitor.
For each visitor (identified by `distinct_id`), Mixpanel checks: did
they fire event A → then event B → then event C, in that order, within
a time window? The percentage who completed each step is your
**conversion rate**; the drop-off between steps tells you where the
flow leaks.

Two key behaviors that matter for our flow:

- **Order matters.** Funnels are ordered. `cta_click_intake` AFTER
  `intake_page_view` doesn't count for a funnel that defines them in
  the opposite order.
- **Time window matters.** Default conversion window is 30 days, but
  for our booking flow (designed to complete in one session), set it
  to 1 hour or even 30 minutes — that's the realistic completion
  window. Longer windows include returning visitors which inflates
  conversion artificially.

---

## The three funnels worth setting up

### 1. Top-of-funnel: discovery → intake start

```
entry_page_view  →  cta_click_intake  →  intake_page_view
```

**What it tells you:** out of visitors who land on a reading entry
page, how many click "Book this Reading", and how many of those
actually reach the intake form. Healthy ratios:

- ~30–60% click-through from entry page to letter page (verso-cta)
- ~70–95% click-through from letter page to intake (drop-cap)
- A drop below ~20% on either step means the entry/letter copy isn't
  selling, or the CTA placement is wrong, or there's a UI bug

**Setup in Mixpanel:**
1. Reports → Funnels → "+ Build new funnel"
2. Add steps: `entry_page_view`, `cta_click_intake`, `intake_page_view`
3. Conversion window: **1 hour**
4. Filter: `environment = production` (excludes dev events; redundant
   once dev/prod project split lands but useful today)
5. Optionally segment by `reading_id` — Soul Blueprint vs Akashic
   vs Birth Chart conversion may differ meaningfully

### 2. Mid-funnel: intake completion

```
intake_page_view  →  intake_page_next_click (validation_pass=true)  →  intake_submit_click  →  intake_submit_success
```

**What it tells you:** of visitors who started the form, how many
made it through validation on each page, attempted submit, and
submitted successfully. Drop-offs to watch:

- High drop on `intake_page_next_click` with `validation_pass=false`
  → users are hitting validation errors. Check which fields by
  filtering `intake_field_first_focus` events for the failing page —
  fields that get focused but the user bounces are likely the
  problem fields.
- High drop on `intake_submit_click` → users got to the end but
  didn't click Submit. Often a consent-checkbox or nonRefundableNotice
  hesitation issue.
- High drop on `intake_submit_success` (after click) → backend
  validation rejecting. Cross-reference `intake_submit_error` events
  by `error_code` — `validation_failed`, `turnstile_failed`,
  `http_400`, `http_500`, `missing_payment_url`, `network_error`.

**Setup:**
1. Steps as above
2. Conversion window: **30 minutes** (if a user is on intake for
   more than 30 min, they probably abandoned and started over)
3. Add a "step filter" on `intake_page_next_click`: `validation_pass = true`
4. Segment by `page_number` to see if a specific page kills conversion

### 3. End-to-end: discovery → paid booking

```
entry_page_view  →  intake_submit_success  →  stripe_redirect  →  payment_success (server-side, PR-F2)
```

**What it tells you:** the only metric that actually matters
commercially — what % of visitors to a reading page end up paying.

**Setup:**
1. Steps as above
2. Conversion window: **1 hour**
3. Filter `environment = production`
4. Segment by `reading_id` — pricing/value-prop differences will
   show up here. Soul Blueprint at $129 vs Akashic at $79 should
   convert differently; if they don't, something's off.
5. **NB:** `payment_success` is fired from the Stripe webhook in
   PR-F2 (not yet shipped). Until then, this funnel ends at
   `stripe_redirect` and assumes Stripe payment success — which
   misses cancellations and webhook failures. Real numbers come
   after PR-F2.

---

## Filters you'll use everywhere

- `environment = production` — exclude dev/preview/workers-dev/local
  events. Once dev/prod project split lands, this filter goes away
  (separate project).
- `reading_id = <slug>` — slice by which reading the visitor was
  pursuing. Important because reading-specific UX (form fields,
  pricing, copy) varies meaningfully.
- `position` (on `cta_click_intake`) — `verso-cta` (entry page) vs
  `drop-cap` (letter page) — tells you which CTA earns the click.

---

## Cohorts to build

Beyond funnels, Mixpanel **Cohorts** let you group visitors by
behavior. Useful ones:

- **Form abandoners:** visitors who fired `intake_page_view` for
  at least one page but never `intake_submit_success`. Drill into
  why (see Clarity replays once that ships).
- **High-effort completers:** visitors with > 2 `intake_page_back_click`
  events but who still completed. Suggests confusing flow that
  succeeded despite friction — copy or layout improvement target.
- **Failed-submit retries:** visitors with at least one
  `intake_submit_error` followed by a successful `intake_submit_success`
  in the same session. Tells you which error codes are recoverable
  vs which kill the session.

---

## Reading the numbers correctly

Two anti-patterns to avoid:

1. **Don't read the absolute numbers at low traffic.** With 10
   visitors a week, "33% conversion" is statistically meaningless
   — it's 1 person more or fewer. Wait for at least 100 visitors
   per cohort before drawing conclusions. Until then, watch trends
   and use Clarity (when it ships) for qualitative insight.

2. **Don't conflate distinct visitors with distinct sessions.** A
   single visitor who bounces, returns next day, and books counts
   as ONE distinct_id with multiple events. Funnels show the
   visitor's full path. If you want session-scoped analysis,
   filter by a session start event or use Mixpanel's Session
   feature.

---

## Operating cadence

Suggested rhythm:

- **Daily** (during soft-launch): glance at Live View — confirms
  events are still flowing, catches CSP / SDK breakage early.
- **Weekly:** review the 3 funnels above. Note any week-over-week
  drop > 10%.
- **Per-reading-edit:** after Josephine changes a reading description
  in Studio, watch the conversion rate for that reading_id over
  the following week. Copy changes have measurable effects.
- **Per-deploy:** spot-check Live View after any PR that touches
  the booking flow. New events should appear; existing events
  should still fire at expected rates.

---

## When events stop arriving

If Live View shows nothing despite traffic, the troubleshooting
order (learned the hard way during PR-F1):

1. Browser DNT setting? Check console for "This browser has Do
   Not Track enabled" warning. Should never appear with our
   `ignore_dnt: true` config.
2. Consent declined? Check localStorage for `josephine.consent =
   "declined"`.
3. CSP block? Network tab → check for blocked POST to
   `api-js.mixpanel.com`. If yes, check `connect-src` in
   `src/middleware.ts` includes the Mixpanel domains.
4. Non-prod gate? If testing on preview/local, confirm
   `NEXT_PUBLIC_TRACK_NON_PROD=1` is set.
5. Token missing? Search bundle sources for the project token
   prefix. If absent, check `.github/workflows/ci.yml` env block
   forwarding.

When in doubt, set `debug: true` in `mixpanel.init()` config
(`src/lib/analytics/client.ts`) — the SDK will dump everything
to console.
