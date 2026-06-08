# Manual Smoke Test

End-to-end walkthrough of the staging site. Run before any production push, or any time a release candidate needs a human sanity check. If anything looks wrong, screenshot it and flag it. Do not troubleshoot mid-walk.

## How this doc is organized

This used to be a list of journeys per release (J1 self-purchase, J12 v1.5.0 admin surface, J13 v1.4.0 one-tap, etc.). After a few releases the doc grew duplicate work: the listen page got visited 6 times, /my-readings got visited 7 times, the DatePicker got opened 3 times across J1, J13g, J14b, J14d. The structure below is **surface-first**: each cluster walks one customer flow once, and lays the per-release checks on top as overlay items inside the natural beat.

If you need to know which release contributes which check, see the **Release coverage matrix** at the bottom.

## Setup

| What | Where |
|------|-------|
| Staging site | https://staging.withjosephine.com |
| Sanity Studio | https://withjosephine.sanity.studio/staging |
| Test inbox | Your personal Gmail. Plus-addressing variants below all land in the same inbox. |
| Stripe test card | `4242 4242 4242 4242`, any future expiry, any 3-digit CVC, any ZIP |
| Mobile viewport | Chrome DevTools toggle device, iPhone 13 (390x844), used in Cluster E |

Use **incognito / private windows** for every customer journey. Cached state breaks the test. Open one incognito per role and label the window mentally ("A self", "B recipient", etc.) to avoid mixing sessions.

**Email plus-addressing on your own Gmail.** Gmail treats `yourname+anything@gmail.com` as the same inbox as `yourname@gmail.com`. The site sees each variant as a different user.

| Suffix | Role | Used in |
|---|---|---|
| `+self` | Self-purchase customer | Cluster A |
| `+gift-selfsend` / `+recipient-selfsend` | Gift purchaser + recipient, self-send mode | Cluster B |
| `+gift-scheduled` / `+recipient-scheduled` | Gift purchaser + recipient, scheduled mode | Cluster C |
| `+gift-cancel-auto` / `+recipient-cancel-auto` | Cancel-auto-send test pair | Cluster C (action: cancel-auto) |
| `+gift-sendnow` / `+recipient-sendnow` | Send-now test pair | Cluster C (action: send-now) |

Add a date suffix (e.g. `+self-20260520`) if you want to tell smoke rounds apart.

**Two roles:**
- **Customer / recipient:** incognito browser, your test Gmail.
- **Becky (Josephine):** Sanity Studio editor. The Becky steps happen after a customer submits and require switching to Studio.

**Maintainer force-cron helper:** `bash scripts/force-cron.sh <route> <submissionId>` (defaults to staging, append `--prod` for production). One-time setup: `brew install cloudflared` then `cloudflared access login https://staging.withjosephine.com`.

---

## Cluster A: Self-purchase end-to-end

Covers v1.0 baseline, v1.4.0 one-tap (J13a, J13d, J13e, J13i), v1.6.0 form polish (J14b, J14d), v1.7.0 bfcache (J15a), v1.10.0 thank-you + rested page (J17c self, J17d /listen).

### A1: Purchase + intake + OC email

**As customer:**
1. Open staging in incognito.
2. Pick **Soul Blueprint** ($179). Click **Book this reading**.
3. On the intake form, open the **Date of Birth** DatePicker. Confirm visually:
   - Prev/next chevrons and month + year dropdowns share a 36px row with a common vertical centerline (v1.6.0 J14b).
   - Tap the month dropdown. The list is brand-styled (cream surface, Cormorant labels, j-rose hover, rounded corners, soft shadow) and not the OS-native option list with bright-white background (v1.6.0 J14d).
   - Confirm the dropdown does not overflow the popover bottom edge.
4. Walk the form. Use a real-looking DOB + city. Upload a small JPEG (~100KB) when asked.
5. Hit the review page, click through to Stripe.
6. Pay with the test card.

**Expect:**
- Redirected to `/thank-you/<id>`. Heading, subheading, reading label, confirmation body, timeline body, contact body, closing line all render with no `{placeholder}` literals (v1.10.0 J17c self).
- **Welcome body uses the self-purchase variant**, not gift wording.
- **Order Confirmation** email arrives within ~1 minute in `+self`. Reading name reads **"Soul Blueprint"** (no leading article).
- **Josephine notification** email arrives at `hello@withjosephine.com`.
- Submission appears in Studio under **Submissions**, sort by newest. The uploaded photo renders in the preview.

**Watch for:**
- Stripe redirects somewhere other than the thank-you page.
- "The Soul Blueprint" or any other article-prefixed service name in OC email subject or body.
- A `{placeholder}` leak in the thank-you page.
- Either email missing after 5 minutes.
- Studio submission missing the photo or any required field.

### A2: Becky delivers + Studio Day-7 schema audit

**As Becky (in Studio):**
1. Open the submission from A1. The **audit trail** shows consent timestamps + IP-hash + request UA-hash entries. Eyeball that they are present.
2. Upload a short MP3 in **Voice note** (~30s, under 5MB).
3. Upload any PDF (~1 page) in **Reading PDF**.
4. Set **Delivered at** to now. **Publish**.
5. Open **Email > Day 7 Delivery** in the Studio sidebar (v1.4.0 J13e). Confirm visible fields are: `subject`, `preview`, `bodyIntro`, `bodyPostButton`, `buttonLabel`. Legacy fields (`greeting`, `lineReady`, `comfortLine`, `signedInDisclosure`, `accessWindowLine`, `comfortFollowUp`) should NOT be visible.

### A3: Day-7 force-fire, one-tap, listen page, remember-me

**As maintainer:** force the Day-7 cron for the A1 submission (replace `<id>`):
```
bash scripts/force-cron.sh email-day-7-deliver <id>
```
Expected response: `{"processed":1,"sent":1,"skipped":0,...}`.

**As customer (in `+self`):**
1. Day-7 delivery email arrives. Subject reads "Your <reading-name> is ready" (verify no leading "The"). Body uses the one-tap copy: "Tap below to open your reading. You will be signed in for the next seven days..." (v1.4.0 J13a). Single CTA, no em-dashes.
2. Tap the CTA. Land on `/my-readings/welcome?t=<lib-token>` with heading "Welcome to your library." and CTA "Continue to your library."
3. Tap **Continue**. Land on `/my-readings?welcome=1`. Reading card visible under **Mine** with an **Open your reading** CTA.
4. Click **Open your reading**. Land on `/listen/<id>`. Audio plays in full. PDF downloads and opens. Filename SHOULD be human-readable (firstname + lastname + reading name), NOT the submission UUID.
5. Confirm top-bar visible on `/listen/<id>`, `/my-readings`, `/my-readings/welcome`: ✦ Josephine wordmark on left, Home link on right (v1.4.0 J13i).
6. Hit the browser **back** button after step 3. The interstitial does NOT restore from bfcache with the consumed token in the URL. The URL stays clean: no `?t=...` reappears (v1.7.0 J15a).
7. Open the same listen URL in a second incognito window (different session). Site shows "This link has rested" form. Submit the email. A fresh email arrives — subject "Open your reading" (separate template from the Day-7 delivery; per F7 the relationship to J13d "Sign in to your library" is a TBD spec question). Tap the CTA. Land on `/listen/<id>?t=<fresh-token>` with heading "Welcome, your reading is here." and CTA "Continue to your reading." Tap, land on `/listen/<id>`.
   - Magic-link body greeting substitutes the user's actual first name, not literal `{firstName}` (v1.5.0 J12b).
8. In that second window, close the listen tab and reopen `/listen/<id>` directly (within 7 days of step 7). The page renders. It does NOT show "This link has rested" (7-day session persistence promise).
9. Visit `/listen/<id>` with an obviously consumed token. Confirm the rested page renders with no em-dashes in heading or body (v1.10.0 J17d /listen rested).

**Routing summary (the two welcome interstitial paths):**
- Original Day-7 delivery email CTA → `/my-readings/welcome?t=...` ("Welcome to your library") → `/my-readings` library → user picks a card → `/listen/<id>`.
- Fresh-link email after a rested listen token → `/listen/<id>?t=...` ("Welcome, your reading is here") → `/listen/<id>` directly. No library detour.

**Watch for:**
- Email body contains the old multi-paragraph copy (greeting + comfort line + signed-in disclosure).
- Audio first-load fires a 429 storm (the OOM bug fixed in PR #209).
- Welcome interstitial skipped, or `?t=` token leaks in Sentry breadcrumbs.
- Listen page renders "asset trouble" or 404 (asset upload didn't land).
- Audio silent or PDF won't open.
- Magic-link email missing after 1 min.
- Session asked for again after refresh inside 7 days. This is the remember-me regression.
- Top-bar missing on any `(authed)` route.
- Em-dash visible on the rested page heading or body.

---

## Cluster B: Gift self-send + recipient + admin emails

Covers v1.0 baseline (J2, J3, J11 admin), v1.4.0 (J13a one-tap on recipient side), v1.5.0 ({firstName} substitution J12b), v1.8.0 (recipient greeting J16a), v1.10.0 (J17c gift modes, J17d /gift/claim em-dash).

### B1: Purchaser buys, self-send mode

**As purchaser (incognito):**
1. Pick **Birth Chart** ($99). Click **Buy as a gift**.
2. Pick **I'll send the link myself** (self-send).
3. Fill purchaser name + `yourname+gift-selfsend@gmail.com`. Tick the 2 consents (Art. 6 + cooling-off, no Art. 9 on the purchaser side).
4. Pay with the test card.

**Expect:**
- Thank-you page renders the **gift self-send variant**: "Your gift link is ready in the email I just sent..." No `{placeholder}` literals (v1.10.0 J17c gift self-send).
- **Gift Purchase Confirmation** email arrives in `+gift-selfsend`. Body contains the **claim URL**. Copy it.
- **Josephine notification** at `hello@withjosephine.com`.

**Watch for:**
- Claim URL missing from the email.
- Wrong thank-you variant (self-purchase or scheduled-gift wording).

### B2: Recipient claims + intake + admin email cross-check

**As recipient (fresh incognito):**
1. Paste the claim URL from B1's email into the address bar. The page greets the recipient with **the purchaser's first name**, not a `{purchaserFirstName}` placeholder.
2. Click through. Enter recipient name + `yourname+recipient-selfsend@gmail.com`. Tick all 3 consents (Art. 6 + Art. 9 + cooling-off).
3. Walk the intake. Upload a small JPEG. Submit.
4. **Em-dash spot-check** on `/gift/claim` surfaces (v1.10.0 J17d): visit `/gift/claim` with no token, and `/gift/claim/<used-token>` after submitting. Confirm `noTokenBody`, `seoTitle`, `alreadySubmittedHeading` carry no em-dashes.

**Expect:**
- Recipient lands on the **gift-recipient thank-you variant**: "Your reading is in Josephine's hands now..." No `{placeholder}` literals (v1.10.0 J17c gift recipient).
- **Order Confirmation** email in `+recipient-selfsend`.
- **Recipient Intake Received** email in `+gift-selfsend` (purchaser inbox).
- **Josephine notification** at `hello@withjosephine.com`.
- New submission appears in Studio with `recipientEmail` populated, linked back to the purchase.

**Watch for:**
- Claim link errors with "already used" on first click.
- Recipient greeting shows literal `{recipientName}` token or wrong name.
- Purchaser inbox doesn't get the **Recipient Intake Received** notification.
- Any em-dash on `/gift/claim` surfaces.

### B3: Becky delivers, recipient listens with greeting

**As Becky:** mirror A2 on the **recipient's submission** from B2. Upload MP3 + PDF. Set Delivered at. Publish.

**As maintainer:** `bash scripts/force-cron.sh email-day-7-deliver <recipient-submission-id>`.

**As recipient (in `+recipient-selfsend`):**
1. Day-7 delivery email arrives. Tap CTA. One-tap interstitial. Land on `/listen/<id>?welcome=1`.
2. Below the welcome ribbon, the greeting line includes the recipient's first name (whatever was typed at intake). It does NOT contain literal `{recipientName}` (v1.8.0 J16a).
3. Audio + PDF accessible.

**Watch for:**
- Recipient's listen page shows the purchaser's data, or vice versa. This is a **CRITICAL cross-user leak**, flag instantly.
- Greeting reads "Hi there" or "Welcome, friend" (fallback chain failure).
- Self-purchase listen page (from A3) shows a recipient greeting block. The isGift gate should suppress it.

---

## Cluster C: Scheduled gift + /my-readings actions + privacy export

Covers v1.0 baseline (J4, J5, J7 privacy export, J11 admin), v1.4.0 unified library + step-up OTP + DateTimePicker + timezone (J13b, J13c, J13g, J13h, J13i), v1.5.0 privacy export substitution (J12c), v1.6.0 hydration + scheduled preview text (J14c, J14g), v1.10.0 LibraryView parity + /my-gifts em-dash (J17b, J17d).

**Setup:** This cluster needs **two** scheduled gift purchases because cancel-auto-send and send-now each terminally consume a gift. Use `+gift-cancel-auto` and `+gift-sendnow`.

### C1: Schedule the gift (run twice, once per terminal action)

**As purchaser:**
1. Set browser timezone to something distinct from UTC (e.g. Europe/Tel_Aviv). Open Chrome DevTools > Sensors > Location to override.
2. Incognito. Pick **Akashic Record** ($79). **Buy as a gift**. Pick **Schedule the delivery**.
3. Fill purchaser name + `yourname+gift-<cancel-auto|sendnow>@gmail.com`.
4. Fill recipient name + `yourname+recipient-<cancel-auto|sendnow>@gmail.com`.
5. Pick **send-at** for ~20 minutes from now (enough time to test cancel-auto and send-now before the auto-fire).
6. Optional gift message. Tick consents. Pay.

**Expect:**
- Thank-you page renders **gift scheduled variant**: "Your gift is scheduled for <date/time>..." (v1.10.0 J17c gift scheduled).
- **Gift Purchase Confirmation (Scheduled)** in purchaser inbox.
   - Send-at renders in the **purchaser's local timezone**, not UTC (v1.4.0 J13h).
   - Preview text (inbox-list snippet before opening) reads "We'll send it to {recipientName} on {sendAtDisplay}." NOT "You don't need to do anything else." (v1.6.0 J14g).
- Josephine notification at `hello@withjosephine.com`.

### C2: /my-readings unified library + Studio preview parity

**As purchaser (sign in via magic link to /my-readings):**
1. Open Chrome DevTools console **before** navigating to `/my-readings`. Hard-refresh. **No "Hydration failed" warning** in console (v1.6.0 J14c).
2. `/my-readings` renders as a single scrollable page with stacked **Mine** + **For others** sections (v1.4.0 J13b).
3. Top-bar visible: ✦ Josephine + Home link (v1.4.0 J13i).
4. Visit `/my-gifts`. It 308-redirects to `/my-readings`.
5. Em-dash spot-check on `/my-gifts` (or post-redirect view): `statusSentLabel`, `privacyNote`, edit-recipient self-send indicator (v1.10.0 J17d).

**As Becky (Studio Presentation Tool):**
6. Open the **My Readings page** singleton in Presentation. The preview iframe matches production layout 1:1: same section headings, same divider position, same empty-state copy (v1.10.0 J17b).
7. Open any customer email singleton (e.g. **Order Confirmation**). Open Presentation's "Used on" panel. Confirm the singleton lists where it's referenced (v1.5.0 J12d).
8. Confirm the `tokenReferenceField` banner is visible at the top of `listenPage`, `giftIntakePage`, and `thankYouPage` schemas (v1.5.0 J12d).

**Watch for:**
- Hydration warning fires on /my-readings.
- Studio preview shows a different layout than production for /my-readings.
- Gift-only accounts (0 readings) cannot reach the readings section (pre-collapse soft-lock from before PR #208).

### C3: Repeatable + terminal actions, step-up OTP, DateTimePicker

**On the `+gift-cancel-auto` purchase:**
1. **View claim link**: click "Copy claim link", paste somewhere to confirm.
2. **Edit recipient**: change name + email > save. Mutation returns `elevationRequired`. OTP modal opens with `role="dialog"`, focus trap, ESC closes (v1.4.0 J13c).
3. Fetch the 6-digit code from the purchaser inbox (subject: "[Josephine] Sign-in code for sensitive change").
4. Enter the code. Modal closes. Mutation completes.
5. **Reschedule**: click **Edit send time**. Confirm the brand DateTimePicker opens, NOT a native `<input type="datetime-local">` (v1.4.0 J13g):
   - Popover with calendar on left, two scroll-snap HH/MM columns on right.
   - Keyboard nav: ArrowDown enters popover, ArrowUp/ArrowDown move within time columns, Enter commits, Escape closes.
   - If testing on real iOS at 375px: scroll-snap time columns work natively, no iOS native `<select>` wheel.
   - No OTP re-prompt (within 10 minutes of step 4, elevation is reused).
6. **Cancel auto-send**: click. 5-second confirm window. Confirm. Card flips to **self-send mode** with a "Copy claim link" button now visible.
7. Wait past the originally-scheduled fire time. Confirm **no claim email** arrives at `+recipient-cancel-auto`.
8. Optionally walk the recipient through B2 using the now-self-send link.

**On the `+gift-sendnow` purchase:**
9. **Send now**: click. Confirm. Within ~1 min, the **Gift Claim** email lands at `+recipient-sendnow`.
10. The /my-readings card updates to show "sent <timestamp>".
11. Original scheduled fire time passes without a duplicate email.
12. **After 10 minutes** from the OTP, attempt another sensitive mutation. OTP re-prompts (elevation expired).

**As Becky (Studio):** Sanity copy editability proof (v1.0 baseline J5e):
13. Open the **My Gifts page** (or **My Readings page**) singleton in Studio. Change `flipToSelfSendCtaLabel` (e.g. add a period). Publish.
14. Back on /my-readings, hard-refresh. New label renders within ~30 seconds. (Revert after smoke.)

**Watch for:**
- OTP modal doesn't open, mutation succeeds without elevation.
- OTP modal ARIA broken (ESC doesn't close, focus escapes, backdrop-click doesn't close).
- Native datetime-local picker appears instead of brand DateTimePicker.
- iOS scroll-snap breaks.
- Gift stays in "scheduled" state after cancel (DO didn't pick up the cancel).
- Original scheduled claim email fires anyway after cancel.
- Send-now AND original scheduled email both fire (idempotency broken).

### C4: Auto-fire + recipient claim + delivery

**For a third purchase** (or reuse the `+gift-scheduled` pair without cancel/send-now), let the scheduled time fire naturally.

**At the scheduled time:**
1. **Recipient inbox** gets the **Gift Claim** email with the claim link.
2. Recipient clicks through. From here mirror B2 (greet, consents, intake, submit).
3. Same follow-on emails as B2.

**Watch for:**
- Claim email doesn't fire within ~5 min of scheduled time (DO scheduler issue).
- Recipient gets the email but link is broken.

**Then Becky delivers and recipient listens** per B3.

### C5: Privacy export (GDPR Art. 20)

**As any signed-in customer (continuing from A3 or C2):**
1. Navigate to `/my-readings`. Click **Export my data**. Confirm.

**Expect:**
- **Privacy Export** email arrives with a download link. Subject + body greeting substitute `{firstName}` to the user's actual first name (v1.5.0 J12c).
- Link downloads a `.zip` containing the submission data (JSON + photos).

**Watch for:**
- Empty / wrong submission data in export.
- 404 on download link.
- Literal `{firstName}` in subject or body (allowlist mismatch in `emailPrivacyExport`).

---

## Cluster D: Admin / Studio surfaces

Covers v1.0 (J9 Sanity Live edits, J11 admin emails consolidation), v1.5.0 (J12a send preview, J12d Used-on), v1.6.0 (J14h dex auto-close observational).

### D1: Sanity Live content edit

1. Studio > pick any landing-page section (e.g. **Hero**). Change the headline. Publish.
2. Refresh `staging.withjosephine.com` (incognito, hard refresh).
3. New headline visible within ~30 seconds.
4. Revert after smoke.

**Watch for:** old text still showing after 2+ min (cache or Live wiring issue).

### D2: Send preview to inbox (Studio doc action)

**As Becky (Studio):**
1. Open any customer email singleton. Open the document menu (⋮) at top right. Confirm **Send preview to inbox...** is listed.
2. Tap it. Paste the admin token. Recipient dropdown populates from `ALLOWED_PREVIEW_RECIPIENTS` env var.
3. Pick a recipient, **Send preview**.

**Expect:**
- Toast confirms send.
- Email arrives within ~1 minute, subject prefixed `[PREVIEW]`.
- Body renders the **currently-published** Sanity copy, not draft.

**Watch for:**
- "Not configured" dialog (env var unset on the worker).
- Action label "Send preview... (publish first)" disabled (unpublished draft exists).
- `[PREVIEW]` prefix missing.

Repeat on at least 2 other email singletons (e.g. **Day-7 Delivery**, **Gift Claim**).

### D3: dex auto-close (observational, no walk)

This fires on the next PR-to-main merge that includes `Closes/Fixes/Resolves dex <id>` in body or commit message. Not a smoke beat; check **Actions tab > dex-auto-close workflow run** after the next merge.

---

## Cluster E: Defensive + a11y + mobile + env-guard

Covers v1.0 (J10 mobile viewport), v1.4.0 (J13f new-device notice), v1.6.0 (J14a hero a11y, J14c hydration check on /my-readings (folded into C2), J14e custom 404 + under-construction, J14f Resend env_guard).

### E1: Mobile viewport (375 to 390px)

Run these at mobile width in Chrome DevTools (iPhone 13):

1. **Landing page**: Hero renders, no horizontal scroll, CTA button tappable, footer reachable.
2. **A1 first page**: Reading selector tappable, consents check correctly, form fields don't overflow.
3. **B2 claim landing**: Recipient greeting renders, intake form fields don't break.

**Watch for:**
- Horizontal scroll anywhere.
- Tappable target < 44 by 44 px.
- Hero image or text clipped.

### E2: Hero scroll-down indicator a11y (keyboard-only)

1. Tab through the landing page from the top. Focus reaches the scroll-down chevron.
2. `aria-label="Scroll to readings"` exposed (DevTools accessibility tree).
3. Press **Enter**: page scrolls to the readings section.
4. Press **Space**: same behavior (no page scroll from default Space).
5. `focus-visible:outline` visible during keyboard nav.

### E3: Custom 404 + under-construction (Sanity-editable)

**As customer:**
1. Hit a non-existent URL (e.g. `withjosephine.com/this-does-not-exist`).
2. 404 page renders with v1.6.0 defaults: tag "✦ Lost in the Stars", heading "This page doesn't exist", description "The path you followed leads nowhere, but the way home is always clear.", button "Return Home".
3. (Optional) hit a route wired to under-construction. Copy reads: tag "✦ Something Beautiful is Coming", heading "Josephine", description "Coming soon: a space for soul readings, birth charts, and Akashic records."

**As Becky:**
4. Confirm **Not Found Page** + **Under Construction Page** singletons appear in Studio sidebar.
5. Make a one-character edit. Publish. Hard-refresh the 404. New text within 30 seconds.

### E4: Resend env_guard (operator-side, non-customer-facing)

In a dev shell with `NEXT_PUBLIC_SANITY_DATASET=staging`:
1. Trigger any send path (e.g. `pnpm test src/lib/resend.test.ts -t env_guard`, or curl a staging webhook with a non-allowlisted recipient).
2. The Resend send returns `skipReason: env_guard` and logs `[resend] ENV_GUARD: skipping <label>...` instead of calling the Resend API.
3. With `NEXT_PUBLIC_SANITY_DATASET=production`, real sends to non-allowlisted recipients proceed (env_guard fires ONLY in non-prod).

### E5: New-device notice (requires 2nd device)

**As recipient (with an existing listen session):**
1. Open the listen page from a different device (or different UA / different IP class) than the one that first redeemed.
2. A "Hey, this might not be you" email arrives within a minute.
3. Tap **This wasn't me**: revokes all active listen sessions for the recipient, admin alert fires.

**Watch for:**
- Notice fires multiple times for the same UA (dedup miss).
- Notice fires on the first redemption (no baseline yet).
- Revoke link doesn't kill the active session.

---

## Cluster F: Contact form

**As customer:**
1. Incognito. Go to staging home, scroll to the contact section (or hit `/#contact`).
2. Fill name + email + message. Complete the Turnstile challenge (or it auto-passes on staging bypass key).
3. Submit.

**Expect:**
- Success state on the page ("Thanks, we'll be in touch...").
- **Contact Message** email arrives at `hello@withjosephine.com`.

---

## Release coverage matrix

Which clusters carry coverage for which release arc. Use this when a release needs an "are we covered?" check.

| Release | Cluster coverage | Specific beats |
|---|---|---|
| v1.0 baseline | A, B, C, D1, E1, F | A1+B1+C1 purchase, A2+B3 deliver, A3+B3+C4 listen, C2 /my-readings, C3 /my-gifts actions, D1 Live edits, E1 mobile, F contact |
| v1.4.0 (one-tap, library, OTP, DateTimePicker, timezone) | A, B, C | A3 (J13a, J13d, J13e, J13i, J15a precursor), B3 (one-tap recipient side), C2 (J13b unified library, J13i top-bar), C3 (J13c OTP, J13g DateTimePicker), C1 (J13h purchaser timezone), E5 (J13f new-device) |
| v1.5.0 (Studio editor surface) | A, C, D | A3 (J12b magic-link {firstName}), C5 (J12c privacy export {firstName}), C2 (J12d Used-on + token banner), D2 (J12a send preview) |
| v1.6.0 (form polish + hydration + env-guard + dex) | A, C, D, E | A1 (J14b DatePicker arrow, J14d Radix Select), C1 (J14g scheduled preview text), C2 (J14c hydration warning), D3 (J14h dex auto-close), E2 (J14a hero a11y), E3 (J14e 404 + under-construction), E4 (J14f env_guard) |
| v1.7.0 (bfcache + null-filter + fragment defense) | A | A3 (J15a bfcache after one-tap, plus rested-page em-dash overlay) |
| v1.8.0 (gift recipient personalization) | B | B3 (J16a recipient greeting on listen page) |
| v1.10.0 (BookingPageShell, LibraryView parity, defaults reconcile) | A, B, C | A1+B1+C1 (J17c thank-you variants), A3 (J17d /listen rested em-dash), B2 (J17d /gift/claim em-dash), C2 (J17b LibraryView preview parity, J17d /my-gifts em-dash) |

For the v1.10.0 specific BookingPageShell 5-route render parity check (formerly J17a): walk these in sequence at mobile width, same browser window, compare header height, back-link position, footer behavior, gold inner-border (`inset-2 md:inset-3`):
1. `/book/soul-blueprint` (control, not wrapped in shell)
2. `/book/soul-blueprint/letter` (letter variant: narrower max-width 2xl, softer shadow)
3. `/book/soul-blueprint/intake` (standard, cream outer bg)
4. `/book/soul-blueprint/gift` (standard, ivory outer bg)
5. `/(authed)/gift/intake?welcome=1` (standard, only reachable after gift claim, also viewable via Studio preview)

This parity check folds naturally into A1 (visit /book/.../intake) + B1 (visit /book/.../gift) + B2 (visit /(authed)/gift/intake post-claim) + a dedicated stop at `/book/soul-blueprint/letter` during cluster A as a non-purchase eyeball.

---

## When done: hand off to the maintainer

You ran the test. Cleanup is NOT your job. D1, Sanity, and R2 deletions are infra operations and a wrong click breaks staging for everyone.

Send the maintainer:

1. **A pass/fail per beat**: "A1 ✅ / A2 ✅ / A3 ❌ (screenshot: Day-7 email didn't arrive) / B1 ✅ / B2 ❌ ..."
2. **Screenshots for any ❌**: that's all the troubleshooting you do.
3. **The time window you ran in**: so the maintainer can scope the cleanup script ("ran between 14:00 and 15:30 UTC today").

The maintainer then:

- Runs `scripts/cleanup-test-submissions.mts staging` to wipe matching D1 + Sanity rows.
- Deletes test R2 uploads from `withjosephine-booking-photos-staging` via the CF dashboard or `wrangler r2 object delete`.
- Reverts any Studio edits from C3 step 13, D1, or E3 step 5.
- Confirms staging is back to a blank baseline before signalling production push.

You don't need access to any of those surfaces.
