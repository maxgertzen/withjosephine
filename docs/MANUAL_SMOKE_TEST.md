# Manual Smoke Test

End-to-end walkthrough of the staging site. Run before any production push or any time a release candidate needs a human sanity check. If anything looks wrong, screenshot it and flag it — don't troubleshoot.

## Setup

| What | Where |
|------|-------|
| Staging site | https://staging.withjosephine.com |
| Sanity Studio | https://withjosephine.sanity.studio/staging |
| Test inbox | Your **personal Gmail** address. Plus-addressing variants (below) all land in the same inbox. |
| Stripe test card | `4242 4242 4242 4242` · any future expiry · any 3-digit CVC · any ZIP |
| Mobile viewport | Chrome DevTools → toggle device → iPhone 13 (390×844) — used in J10 |

Use **incognito / private windows** for every customer journey. Cached state breaks the test. Open one incognito per journey and label the window mentally ("J1 self", "J3 recipient", etc.) to avoid mixing sessions.

**Email plus-addressing on your own Gmail.** Gmail treats `yourname+anything@gmail.com` as the same inbox as `yourname@gmail.com` — the `+suffix` is ignored on delivery but the site sees each variant as a different user. Suggested suffix table for one full smoke run:

| Suffix | Role | Used in |
|---|---|---|
| `+self` | Self-purchase customer | J1 |
| `+gift-selfsend` | Gift purchaser, self-send mode | J2 |
| `+recipient-selfsend` | Gift recipient via self-send link | J3 |
| `+gift-scheduled` | Gift purchaser, scheduled mode | J4 |
| `+recipient-scheduled` | Gift recipient via auto-fire | J4 |
| `+gift-cancel-auto` / `+recipient-cancel-auto` | J5 cancel-auto-send test pair | J5 |
| `+gift-sendnow` / `+recipient-sendnow` | J5 send-now test pair | J5 |

Add a date suffix (e.g. `+self-20260520`) if you want to tell smoke rounds apart.

**Two roles in this walkthrough:**
- **Customer / recipient** — incognito browser, your test Gmail.
- **Becky (Josephine)** — Sanity Studio editor. The "Becky" sections happen after a customer/recipient submits and require you to switch to Studio.

---

## Journey 1 — Self-purchase end-to-end

### J1a — Customer purchases

**As customer:**
1. Open staging in incognito.
2. Pick **Soul Blueprint** ($179). Click **Book this reading**.
3. Tick the consent boxes, enter name + `yourname+self@gmail.com`, continue.
4. Walk through the form. Use a real-looking DOB + city. **Upload a small JPEG** when asked (~100KB).
5. Hit the review page → click through to Stripe.
6. Pay with the test card.

**Expect:**
- ✅ Redirected to `/thank-you/<id>` with the reading name and a **welcome body matching the self-purchase variant** (not gift wording).
- ✅ **Order Confirmation** email within ~1 minute in `+self`.
- ✅ **Josephine notification** email arrives at `hello@withjosephine.com` (the real inbox) — admin alert for the new submission.
- ✅ Submission appears in Studio → **Submissions** (sort by newest). The uploaded photo renders in the submission preview.

**Watch for:**
- ❌ Stripe redirects somewhere other than the thank-you page → screenshot, flag.
- ❌ Either email doesn't arrive within 5 minutes → flag.
- ❌ The submission in Studio is missing the photo or any required field → flag.

### J1b — Becky delivers

**As Becky (in Studio):**
1. Open the submission. The **audit trail** should show consent timestamps + IP-hash + request UA-hash entries — eyeball that they're present.
2. Upload a short MP3 in **Voice note** (~30s, under 5MB).
3. Upload any PDF (~1 page) in **Reading PDF**.
4. Set **Delivered at** to now. **Publish**.

### J1c — Customer listens

**Back as customer, in inbox:**
1. **Day-7 delivery** email arrives within ~1 hour (or ask the maintainer to fire the cron manually for the smoke).
2. Click **Listen to your reading**.
3. Listen page asks to confirm the email — enter `yourname+self@gmail.com`.
4. **Send sign-in link** → check inbox → click the **Magic Link** email.
5. Confirm-email page asks for the email again (anti-typo gate). Enter it.
6. Listen page renders. Audio plays. PDF downloads.

**Watch for:**
- ❌ Listen page shows "asset trouble" or 404 → the upload didn't land; re-check Studio.
- ❌ Audio is silent or PDF won't open → file upload corrupted.
- ❌ Magic link email doesn't arrive within 1 min → flag.
- ❌ Session asked for again after refresh — session should persist for 7 days.

---

## Journey 2 — Gift purchase, self-send mode

The purchaser forwards the claim link to the recipient themselves. No scheduled delivery.

**As purchaser:**
1. Incognito. Pick **Birth Chart** ($99). Click **Buy as a gift**.
2. Pick **I'll send the link myself** (self-send mode).
3. Fill purchaser name + `yourname+gift-selfsend@gmail.com`. Tick the 2 consents (Art. 6 + cooling-off — no Art. 9 on the purchaser side).
4. Pay with the test card.

**Expect:**
- ✅ Thank-you page shows the **gift self-send variant** copy ("Your gift link is ready in the email I just sent…").
- ✅ **Gift Purchase Confirmation** email arrives in `+gift-selfsend`. The email body contains the **claim URL**. Copy it.
- ✅ **Josephine notification** email arrives at `hello@withjosephine.com` for the gift purchase.

**Watch for:**
- ❌ Claim URL is missing from the email → flag immediately.
- ❌ Thank-you variant copy is wrong (shows self-purchase or scheduled-gift wording) → flag.

---

## Journey 3 — Gift recipient claims (self-send), gets delivered

### J3a — Recipient claims + submits intake

**As recipient (fresh incognito):**
1. Paste the claim URL from J2's email into the address bar.
2. The page greets the recipient with **the purchaser's first name** (not a `{purchaserFirstName}` placeholder).
3. Click through to start the intake.
4. Enter recipient name + `yourname+recipient-selfsend@gmail.com`. Tick the 3 consents (Art. 6 + Art. 9 + cooling-off — recipient acks Art. 9 here, not the purchaser).
5. Walk through the intake form. Upload a small JPEG.
6. Submit.

**Expect:**
- ✅ Recipient lands on the **gift-recipient thank-you variant** ("Your reading is in Josephine's hands now…") — different copy from the self-purchase or purchaser-side thank-yous.
- ✅ **Order Confirmation**-style email arrives in `+recipient-selfsend`.
- ✅ **Recipient Intake Received** email arrives in `+gift-selfsend` (the purchaser's inbox) — notifies the purchaser their gift recipient submitted.
- ✅ **Josephine notification** arrives at `hello@withjosephine.com` for the recipient submission.
- ✅ A new submission appears in Studio with `recipientEmail` populated + a link/ref to the original purchase.

**Watch for:**
- ❌ Claim link errors with "already used" on first click → flag.
- ❌ Recipient name greeting is wrong / shows a token like `{recipientName}` → CMS slot didn't substitute.
- ❌ Purchaser inbox doesn't get the **Recipient Intake Received** notification → flag.

### J3b — Becky delivers the recipient's reading

**As Becky (in Studio):**
Same flow as J1b but on the **recipient's submission** from J3a.
1. Upload MP3 + PDF.
2. Set **Delivered at**. **Publish**.

### J3c — Recipient listens

**Back as recipient, in `+recipient-selfsend` inbox:**
1. **Day-7 delivery** email arrives.
2. Click through, confirm email at the anti-typo gate, magic-link verify.
3. Listen page renders. Audio + PDF accessible.

**Watch for:**
- ❌ Recipient's listen page shows the purchaser's data or vice versa → **CRITICAL cross-user leak**, flag instantly.

---

## Journey 4 — Gift purchase, scheduled mode, auto-fire + delivery

The site sends the claim link to the recipient automatically at a chosen time.

### J4a — Purchaser schedules

**As purchaser:**
1. Incognito. Pick **Akashic Record** ($79). **Buy as a gift**.
2. Pick **Schedule the delivery** mode.
3. Fill purchaser name + `yourname+gift-scheduled@gmail.com`.
4. Fill recipient name + `yourname+recipient-scheduled@gmail.com`.
5. Pick **send-at** for 5 minutes from now (so you can watch it fire).
6. Optional gift message (~1 sentence). Tick consents. Pay.

**Expect:**
- ✅ Thank-you page shows the **gift scheduled variant** ("Your gift is scheduled for <date/time>…").
- ✅ Purchaser inbox: **Gift Purchase Confirmation** with the scheduled timing.
- ✅ Josephine notification at `hello@withjosephine.com`.

### J4b — Auto-fire + recipient claims

**At the scheduled time (5 min later):**
1. **Recipient inbox (`+recipient-scheduled`)** gets the **Gift Claim** email with the claim link.
2. Recipient clicks through. From here mirror J3a (greet → consents → intake → submit).

**Expect:**
- ✅ Same set of follow-on emails as J3a: recipient's Order Confirmation, purchaser's Recipient Intake Received, Josephine notification.

**Watch for:**
- ❌ Claim email doesn't fire within ~5 min of the scheduled time → DO scheduler issue, flag.
- ❌ Recipient gets the email but link is broken → flag.

### J4c — Becky delivers + J4d — Recipient listens

Same as J3b + J3c but for the J4 recipient submission. Confirm Day-7 + magic-link + listen page all work.

---

## Journey 5 — /my-gifts purchaser actions

The purchaser manages a scheduled gift via `/my-gifts`. Some actions are repeatable (edit-recipient, reschedule, view-link, regenerate); two actions are **terminal** (cancel-auto-send, send-now), each consuming a fresh scheduled gift, so this journey requires **2 separate scheduled gift purchases** (use the `+gift-cancel-auto` and `+gift-sendnow` pairs from the suffix table).

For each terminal-action test, do a fresh `J4a` purchase first to set up the scheduled gift, picking send-at ~20 minutes out (so you have time to take the action before it fires).

### J5a — Sign in to /my-gifts

For each of the two purchaser inboxes:
1. Incognito. Go to staging home → click **My Gifts** in the footer (or hit `/my-gifts` directly).
2. Enter the purchaser's email. **Send sign-in link**.
3. Check inbox → click **Magic Link** email.
4. Authenticated. The page lists the gifts this purchaser bought.

**Expect:**
- ✅ Only the gifts purchased by *this* email show. Other purchasers' gifts must not appear.

**Watch for:**
- ❌ Cross-user leak (shows another purchaser's gift) → **CRITICAL**, flag instantly.

### J5b — Repeatable actions (run on either purchase)

| Action | What to do | What to expect |
|--------|-----------|----------------|
| **View claim link** | Click "Copy claim link" | Link copies to clipboard; paste it somewhere to confirm |
| **Edit recipient** | Change name + email → save | Card reflects new recipient; future claim email goes there |
| **Reschedule send-at** | Pick a new date/time → save | Card shows new scheduled time |
| **Regenerate claim link** | Click "Regenerate" → confirm | Old claim link 404s on visit; new link works; 5-min cooldown enforced if you try to regenerate again immediately |

### J5c — Cancel-auto-send (uses `+gift-cancel-auto`)

1. On the `+gift-cancel-auto` scheduled gift, click **Cancel auto-send** → 5-second confirm window → confirm.
2. Card flips to **self-send mode**; a "Copy claim link" button is now visible.
3. Verify: at the originally-scheduled fire time, **no claim email** arrives at `+recipient-cancel-auto`.
4. Optionally: copy the claim link from the card and walk the recipient through the J3a flow.

**Watch for:**
- ❌ Gift stays in "scheduled" state after the cancel → DO didn't pick up the cancel, flag.
- ❌ The originally-scheduled claim email fires anyway → DO race, flag.

### J5d — Send-now (uses `+gift-sendnow`)

1. On the `+gift-sendnow` scheduled gift, click **Send now** → confirm.
2. **Within ~1 min**, the **Gift Claim** email lands at `+recipient-sendnow` — fired immediately, not at the original scheduled time.
3. The /my-gifts card updates to show "sent <timestamp>".
4. Verify the original scheduled fire-time passes without a duplicate email.

**Watch for:**
- ❌ Claim email doesn't fire within ~1 min of send-now click → flag.
- ❌ Both the send-now email AND the original scheduled email fire → idempotency broken, flag.

### J5e — Sanity-editable copy on /my-gifts (post-launch editability proof)

**As Becky (in Studio, on the staging dataset):**
1. Open the **My Gifts page** singleton.
2. Change `flipToSelfSendCtaLabel` to a different string (e.g. add a period).
3. **Publish**.

**Back as purchaser** on `/my-gifts`:
1. Hard-refresh.
2. The new label should render within ~30 seconds.

(Revert the change after smoke ends.)

---

## Journey 6 — Listen page magic-link (covered)

Listen-page magic-link auth is exercised in J1c, J3c, and J4d. No separate journey needed unless you want to specifically test:
- 7-day session persistence (refresh `/listen/<id>` after sign-in; should not ask for magic-link again)
- Anti-typo gate (try entering the wrong email at the confirm-email step; should be rejected)

---

## Journey 7 — Privacy export (GDPR Art. 20)

**As customer with an existing session** (continuing from J1c, same incognito):
1. Navigate to `/my-readings` (or click "My readings" in the listen page footer).
2. Click **Export my data**.
3. Confirm the action.

**Expect:**
- ✅ **Privacy Export** email arrives with a download link.
- ✅ Link downloads a `.zip` containing the submission data (JSON + photos).

**Watch for:**
- ❌ Export email arrives with empty / wrong submission data → flag.
- ❌ Download link 404s → flag.

---

## Journey 8 — Contact form

1. Incognito. Go to staging home → scroll to the contact section (or hit `/#contact`).
2. Fill name + email + message. Complete the Turnstile challenge (or it auto-passes on staging's bypass key).
3. Submit.

**Expect:**
- ✅ Success state appears on the page ("Thanks, we'll be in touch…").
- ✅ **Contact Message** email arrives at `hello@withjosephine.com`.

---

## Journey 9 — Studio content edits (Sanity Live)

Quick sanity check that the editorial workflow still works:

1. Studio → pick any landing-page section (e.g. **Hero**).
2. Change the headline. **Publish**.
3. Refresh `staging.withjosephine.com` (incognito, hard refresh).

**Expect:**
- ✅ New headline visible within ~30 seconds (Sanity Live).

**Watch for:**
- ❌ Old text still showing after 2+ min → cache or Live wiring issue, flag.

Revert the edit after smoke ends.

---

## Journey 10 — Mobile viewport (375–390px)

Primary traffic is TikTok on phones. At minimum, run these journeys at mobile width in Chrome DevTools (toggle device → iPhone 13):

1. **Landing page** — Hero renders, no horizontal scroll, CTA button tappable, footer reachable.
2. **J1 first page** — Reading selector tappable, consents check correctly, form fields don't overflow.
3. **J3 claim landing** — Recipient greeting renders, intake form fields don't break.

**Watch for:**
- ❌ Horizontal scroll anywhere → layout bug, flag.
- ❌ Tappable target < 44×44 px → accessibility, flag.
- ❌ Hero image or text clipped → responsive bug, flag.

---

## Journey 11 — Admin email surfaces (cross-check)

This is a checklist that runs **alongside** J1, J3, J4, J5 — it just consolidates the admin-side emails so you can verify them in one pass.

For each submission across J1, J3 (recipient), J4 (recipient), J5 send-now recipient:

| Email | Where it lands | When |
|---|---|---|
| **Josephine notification** | `hello@withjosephine.com` | Every submission (customer, gift recipient) |
| **Recipient Intake Received** | Purchaser's inbox (`+gift-*`) | Every gift recipient submission |
| **Day-2 Started** | Customer / recipient inbox | ⚠️ Currently disabled (PR #149). Skip until re-enabled. |

Eyeball that the from-address is `Josephine <hello@withjosephine.com>` and the subject lines aren't garbled (no `{placeholder}` leakage, no double-spaces).

---

## Journey 12 — v1.5.0 Studio editor surface (admin-side)

Verifies the Phase 7 changes that shipped in v1.5.0 (PR #227, tag `v1.5.0`). All three sub-journeys are admin-side — no customer-facing flow change.

### J12a — Send preview to inbox (Studio doc action)

**As Becky (Studio):**
1. Open https://withjosephine.sanity.studio/ → **Production** workspace → any customer email singleton (e.g. **Order Confirmation**).
2. Open the document menu (⋮) at top right. Confirm **Send preview to inbox…** is listed.
3. Tap it. Paste the admin token. The recipient dropdown should populate from the worker `ALLOWED_PREVIEW_RECIPIENTS` env var (`hello@withjosephine.com` + `maxgertzen+withjosephine-preview@gmail.com`).
4. Pick a recipient → **Send preview**.

**Expect:**
- ✅ Toast confirms send.
- ✅ Email arrives in the chosen inbox within ~1 minute, subject prefixed `[PREVIEW]`.
- ✅ Body renders the **currently-published** Sanity copy (not draft).

**Watch for:**
- ❌ "Not configured" dialog → `ALLOWED_PREVIEW_RECIPIENTS` env var unset on the worker — flag.
- ❌ Action label shows "Send preview… (publish first)" and is disabled → there's an unpublished draft; publish first then retry.
- ❌ `[PREVIEW]` prefix missing → action wired wrong, flag.
- ❌ Audit row not landing in `audit_events` (Admin tooling check) → flag.

Repeat on at least 2 other email singletons (e.g. **Day-7 Delivery**, **Gift Claim**) to confirm the action is broadly available.

### J12b — Magic-link customer-name tokens

Requires a user with at least one **paid** submission in the target environment.

**As customer:**
1. Hit any magic-link sign-in entry point (e.g. `/listen/<id>`, `/my-readings` first visit, gift-claim flow).
2. Enter the email of a user with a paid submission.

**Expect:**
- ✅ The Magic Link email subject + body substitute `{firstName}` to the user's actual first name (extracted from their most recent paid submission's responses).
- ✅ If the Sanity-edited copy uses `{readingName}` or `{readingPriceDisplay}`, those substitute correctly too (publish a Sanity edit with those tokens first if you want a positive test).
- ✅ For a brand-new email with **no** paid submission yet, the fallback "there" renders (not the literal `{firstName}` token).

**Watch for:**
- ❌ Literal `{firstName}` or `{readingName}` leaks into subject/body → token allowlist mismatch, flag.
- ❌ Wrong name (someone else's) → repo helper picked the wrong row, flag.

### J12c — Privacy export `{firstName}` substitution

**As customer:**
1. Trigger a GDPR Art. 20 privacy export from `/privacy/export` for an email tied to a paid submission.
2. Wait for the export email.

**Expect:**
- ✅ Subject + body greeting substitute `{firstName}` to the user's actual first name.
- ✅ ZIP attachment renders correctly (unchanged from prior smoke).

**Watch for:**
- ❌ Literal `{firstName}` leaks → allowlist mismatch in `emailPrivacyExport`, flag.

### J12d — Studio "Used on" / Presentation entries (eyeball)

**As Becky (Studio):**
1. Open any of the 12 customer email singletons in the **Production** workspace.
2. Use Presentation's "Used on" panel (envelope icon in the sidebar).

**Expect:**
- ✅ Each email singleton lists where it's referenced (via the `defineLocations` entries shipped in PR #223).
- ✅ The `tokenReferenceField` banner is visible at the top of `listenPage`, `giftIntakePage`, and `thankYouPage` schemas (lists the available `{token}` placeholders Becky can use in copy).

**Watch for:**
- ❌ Token banner missing or empty → schema deploy didn't pick up the change, flag (and try `pnpm studio:deploy` again).

---

## Journey 13 — v1.4.0 one-tap delivery + unified library + step-up OTP

Verifies the v1.4.0 arc (epic `23ctexvw`, PR #218 squash `b1ebbf8`, tag `v1.4.0`). Real-browser smoke against deployed prod is still owed per `feedback_real_browser_smoke_before_ship_claim`.

### J13a — One-tap day-7 delivery (Phase 1)

**As maintainer:** force a day-7 send via the cron route for a delivered prod submission:

```sh
TOKEN=$(cloudflared access token --app https://withjosephine.com)
curl -X POST -H "Authorization: Bearer $PROD_CRON_SECRET" -H "cf-access-token: $TOKEN" "https://withjosephine.com/api/cron/email-day-7-deliver?force=<submissionId>"
```

**As customer (in the submission's inbox):**
1. Day-7 delivery email arrives. Body uses the new copy: "Tap below to open your reading. You will be signed in for the next seven days..." (em-dash-free, single CTA).
2. Tap the button. Land on `/my-readings/welcome` (NOT a magic-link request page).
3. Tap **Continue**. Land on `/listen/[id]?welcome=1`.
4. Audio plays. PDF downloads.

**Watch for:**
- ❌ Email body contains the old multi-paragraph copy (greeting + comfort line + signed-in disclosure) → Sanity stale, run seed.
- ❌ Audio first-load fires a 429 storm (the OOM bug fixed in PR #209) → regression.
- ❌ Welcome interstitial skipped or `?t=` token leaks in Sentry breadcrumbs → token redaction broke.

### J13b — Unified library + redirects (Phase 2)

**As customer (with at least one paid reading):**
1. Sign in via `/my-readings` magic link.
2. `/my-readings` renders as a single scrollable page with stacked "Mine" + "For others" sections.
3. Old `/my-gifts` link 308-redirects to `/my-readings`.
4. `/my-readings/gifts` deep-link still works (legacy, may redirect or render).

**Watch for:**
- ❌ Gift-only accounts (0 readings) — the Readings tab/section must be reachable (PR #208 collapsed tabs into stacked sections; pre-collapse this would have soft-locked).

### J13c — Step-up OTP on edit-recipient + send-now (Phase 3)

**As purchaser (on `/my-readings`, with at least one active scheduled gift):**
1. Click **Edit recipient** on the gift card → mutation returns `elevationRequired`.
2. OTP modal opens. `role="dialog"`, focus trap, ESC closes.
3. Fetch the 6-digit code from the purchaser's inbox (subject "[Josephine] Sign-in code for sensitive change").
4. Enter the code → modal closes → mutation completes.
5. **Within 10 minutes**, click **Send now** on the same or another scheduled gift — should NOT re-prompt for OTP (elevation reuse).
6. **After 10 minutes**, retry — should re-prompt.

**Watch for:**
- ❌ OTP modal doesn't open / mutation succeeds without elevation → `requireElevation` guard not wired.
- ❌ OTP modal ARIA broken (ESC doesn't close, focus escapes, backdrop-click doesn't close) → modal a11y regression.
- ❌ Code arrives but verification fails → HKDF subkey misconfigured or 5-attempt poison fired.

### J13d — Magic-link library variant (A1)

**As customer (sign in via `/my-readings`):**
1. Magic-link email subject: "Sign in to your library" (was "Sign in to my-readings" in earlier versions).
2. Email body uses the unified library copy (`emailMagicLinkLibrary` Sanity singleton).

**Watch for:**
- ❌ Subject reads "Sign in to my-readings" or "Sign in to my-gifts" → Sanity not refreshed; check `emailMagicLinkLibrary` exists in prod.

### J13e — Day-7 schema collapse + copy rewrite

**As Becky (Studio, Production workspace):**
1. Open **Email — Day 7 Delivery**.
2. Fields visible: `subject`, `preview`, `bodyIntro`, `bodyPostButton`, `buttonLabel`. Legacy `greeting` / `lineReady` / `comfortLine` / `signedInDisclosure` / `accessWindowLine` / `comfortFollowUp` fields should NOT be visible (removed in PR #217).
3. Body text uses the rewritten honest one-tap phrasing.

### J13f — New-device notice (Phase 5)

**As recipient (with an existing listen session):**
1. Open the listen page from a different device (or different UA / different IP class) than the one that first redeemed the magic link.
2. A "Hey, this might not be you" email arrives within a minute.
3. Tap **This wasn't me** → revokes all active listen sessions for the recipient + admin alert fires.

**Watch for:**
- ❌ Notice fires multiple times for the same UA → dedup table miss.
- ❌ Notice fires on the first redemption (no baseline yet) → guard broken.
- ❌ Revoke link doesn't kill the active session → `/api/auth/revoke-recipient-sessions` broken.

### J13g — Brand DateTimePicker on edit-recipient + flip-to-scheduled

**As purchaser (on `/my-readings`, on a scheduled gift):**
1. Click **Edit send time** (or equivalent).
2. The picker is the brand DateTimePicker (popover with calendar on left, two scroll-snap HH/MM columns on right) — NOT a native `<input type="datetime-local">`.
3. Test keyboard nav: ArrowDown enters the popover, ArrowUp/ArrowDown move within time columns, Enter commits, Escape closes.
4. Test on real iOS mobile (375px): the scroll-snap time columns should work natively without iOS native `<select>` wheel interfering.

**Watch for:**
- ❌ Native datetime-local picker appears → DateTimePicker not wired.
- ❌ iOS scroll-snap breaks (taps register but column doesn't snap) → known a11y-review flag; document on Max's smoke notes.

### J13h — Purchaser timezone on scheduled-gift OC email

**As purchaser (J4-style scheduled gift purchase):**
1. Set browser timezone to something distinct from UTC (e.g. Europe/Tel_Aviv).
2. Complete the scheduled gift purchase with a `send-at` 30 min in the future.
3. **Order Confirmation** email arrives. Subject + body render `send-at` in the **purchaser's local timezone**, not UTC.

**Watch for:**
- ❌ Send-at renders in UTC → `submissions.purchaser_time_zone` not captured at purchase or not read by the webhook.

### J13i — `(authed)` route group top-bar

**As customer signed in via magic link:**
1. Land on `/my-readings`, `/listen/<id>`, `/gift/intake`, `/gift/claim/<token>`, or `/thank-you/<readingId>`.
2. The top of the page shows a sticky brand top-bar: **✦ Josephine** wordmark on the left + **Home** link.
3. Top-bar renders on all 5 routes. URLs unchanged.

**Watch for:**
- ❌ Top-bar missing on any of the 5 routes → `(authed)/layout.tsx` not applied.

---

## Journey 14 — v1.6.0 form polish + hydration + env-guard + dex automation

Verifies the v1.6.0 arc (PR #240 squash `24b53a0`, tag `v1.6.0`). Real-browser smoke against deployed prod is owed.

### J14a — Hero scroll-down indicator a11y

**As customer (keyboard-only, on landing page):**
1. Tab through the page from the top. Focus reaches the scroll-down indicator chevron.
2. `aria-label="Scroll to readings"` is exposed (verify via DevTools accessibility tree).
3. Press **Enter** → page scrolls to the readings section.
4. Press **Space** → same behavior (no page scroll from default Space).
5. Other keys do nothing.
6. `focus-visible:outline` is visible during keyboard nav.

**Watch for:**
- ❌ Indicator unreachable via Tab → `tabIndex={0}` missing.
- ❌ Space scrolls the page instead of activating → `preventDefault` on Space missing.

### J14b — DatePicker arrow + dropdown alignment

**As customer (intake form, DOB field):**
1. Open the DatePicker popover.
2. The prev/next chevron arrows and the month + year dropdowns share a 36px-tall row with a common vertical centerline (no visual disconnect).
3. Confirm at 375px mobile width and at desktop.

### J14c — GiftStatusPill no-hydration-warn

**As purchaser (on `/my-readings`, with at least one scheduled gift):**
1. Open Chrome DevTools console BEFORE navigating to `/my-readings`.
2. Hard-refresh `/my-readings`.
3. No "Hydration failed because the server rendered text didn't match the client" warning should fire (this was firing on every render in earlier versions due to TZ-dependent date-fns `format(parseISO(iso))`).
4. The status pill renders the scheduled moment correctly (e.g. "in 3 days").

**Watch for:**
- ❌ Hydration warning still fires → `useIsClient` hook not wired or new code path bypassed.

### J14d — Brand Radix Select in pickers + intake form

**As customer (intake form):**
1. Open the DOB DatePicker → tap the **month** dropdown.
2. The dropdown is brand-styled: cream surface, Cormorant labels, j-rose hover, rounded corners, soft shadow. NOT the OS-native option list with bright-white background.
3. Same for **year**, **hour**, **minute**.
4. Same for any Sanity-driven `<select>` in IntakeForm (e.g. category fields if any).
5. ARIA contract: trigger has `role="combobox"`, listbox has correct roles, ItemIndicator Check icon is `aria-hidden`.

**Watch for:**
- ❌ Native OS option list appears → Radix Select didn't take, or `portalContainer` not set so listbox escapes the popover stacking context.

### J14e — Custom 404 + under-construction pages (Sanity-editable)

**As customer:**
1. Hit a non-existent URL (e.g. `withjosephine.com/this-does-not-exist`).
2. The 404 page renders with the **new defaults from v1.6.0**: tag "✦ Lost in the Stars", heading "This page doesn't exist", description "The path you followed leads nowhere, but the way home is always clear.", button "Return Home".
3. (Optional, if under-construction is wired to a route in prod) hit that route — copy reads: tag "✦ Something Beautiful is Coming", heading "Josephine", description "Coming soon: a space for soul readings, birth charts, and Akashic records."

**As Becky (Studio, Production workspace):**
4. Confirm the **Not Found Page** + **Under Construction Page** singletons appear in the Studio sidebar (these were never seeded on prod before today; backfilled in this session).
5. Make a one-character edit to one of them. **Publish**. Hard-refresh the 404 page within 30 seconds. New text renders.

**Watch for:**
- ❌ 404 still shows the inline-defaults copy from before v1.6.0 → Sanity not seeded on prod (this session's seed run should have fixed it; if not, re-run `pnpm tsx scripts/seed-customer-emails-and-pages.mts production`).
- ❌ Becky can't find the Not Found / Under Construction singletons in Studio → Studio re-deploy didn't pick up the new schema; run `pnpm studio:deploy`.

### J14f — Resend env_guard (Layer-3 defense) — operator-side proof

This is a **non-customer-facing** check; it proves the env-guard prevents accidental sends from a non-prod env.

**As maintainer (locally or in a staging dev shell):**
1. In a dev shell with `NEXT_PUBLIC_SANITY_DATASET=staging`, trigger ANY send path (e.g. `pnpm test src/lib/resend.test.ts -t env_guard` or curl a staging webhook with a non-allowlisted recipient).
2. The Resend send returns `skipReason: env_guard` and logs `[resend] ENV_GUARD — skipping <label>...` instead of calling the Resend API.
3. With `NEXT_PUBLIC_SANITY_DATASET=production` (prod worker env), real sends to non-allowlisted recipients proceed normally — env_guard fires ONLY in non-prod.

**Watch for:**
- ❌ Send proceeds anyway in staging → env_guard not in the send pipeline before flag + header checks.

### J14g — Gift scheduled-preview copy

**As purchaser (J4-style scheduled gift purchase):**
1. Complete the scheduled gift purchase.
2. **Gift Purchase Confirmation (Scheduled)** email arrives.
3. The **preview text** (the snippet shown in the inbox list before opening the email) reads: "We'll send it to {recipientName} on {sendAtDisplay}." NOT the old misaligned phrase "You don't need to do anything else."

**Watch for:**
- ❌ Preview still reads "You don't need to do anything else." → migration didn't run or Becky re-edited it post-migration; if Becky's intent was the old phrase, that's an editorial decision, not a regression.

### J14h — dex auto-close (operator-side, observational)

This fires on the next PR-to-main merge that includes a `Closes/Fixes/Resolves dex <id>` marker in its body or commit message.

**As maintainer (post-next-merge):**
1. Watch the **Actions** tab → **dex-auto-close** workflow run.
2. The workflow run log lists each `Closes dex <id>` it parsed and reports each `dex complete` outcome.
3. A bookkeeping commit `chore(dex): auto-close tasks for PR #<n>` lands on `main` updating `.dex/tasks.jsonl`.

**Watch for:**
- ❌ Workflow doesn't fire → `.github/workflows/dex-auto-close.yml` not deployed, or `pull_request` event missing the `closed`/`merged` filter.
- ❌ Tasks not actually closed in `.dex/tasks.jsonl` after the commit lands → `dex complete --force` failed silently.

---

## When done — hand off to the maintainer

You ran the test. Cleanup is **not your job** — D1, Sanity, and R2 deletions are infra operations and a wrong click there can break staging for everyone.

Send the maintainer:

1. **A pass/fail per journey** — "J1a ✅ / J1b ✅ / J1c ❌ (screenshot: Day-7 email didn't arrive) / J2 ✅ / J3a ✅ …"
2. **Screenshots for any ❌** — that's all the troubleshooting you do.
3. **The time window you ran in** — so the maintainer can scope the cleanup script to just the test rows ("ran between 14:00 and 15:30 UTC today").

The maintainer then:

- Runs `scripts/cleanup-test-submissions.mts staging` to wipe the matching D1 + Sanity rows.
- Deletes the test R2 uploads from `withjosephine-booking-photos-staging` via the CF dashboard or `wrangler r2 object delete`.
- Reverts any Studio edits made in J5f / J9.
- Confirms staging is back to a blank baseline before signalling production push.

You don't need access to any of those surfaces.
