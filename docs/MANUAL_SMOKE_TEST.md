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
