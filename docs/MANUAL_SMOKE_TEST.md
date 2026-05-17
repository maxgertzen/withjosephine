# Manual Smoke Test

End-to-end walkthrough of the staging site. Run before any production push or any time a release candidate needs a human sanity check. If anything looks wrong, screenshot it and flag it — don't troubleshoot.

## Setup

| What | Where |
|------|-------|
| Staging site | https://staging.withjosephine.com |
| Sanity Studio | https://withjosephine.sanity.studio/staging |
| Test inbox | Your **personal Gmail** address. You'll use plus-addressing to keep flows separate (see below). |
| Stripe test card | `4242 4242 4242 4242` · any future expiry · any 3-digit CVC · any ZIP |

Use **incognito / private windows** for every customer journey. Cached state breaks the test.

**Email addresses — plus-addressing on your own Gmail:**

Gmail treats `yourname+anything@gmail.com` as the same inbox as `yourname@gmail.com` — the `+suffix` is ignored on delivery but the site sees each variant as a different user. Use:

- `yourname+test1@gmail.com` — for self-purchase (Journey 1)
- `yourname+test2@gmail.com` — for gift purchaser (Journeys 2, 4)
- `yourname+recipient@gmail.com` — for gift recipient (Journey 3, Journey 4 follow-up)
- `yourname+test3@gmail.com` — for the scheduled gift purchaser (Journey 4)

All five land in your personal inbox. Use a fresh suffix for each fresh run so you can tell rounds apart.

---

## Journey 1 — Self-purchase

**As customer:**
1. Open staging in incognito.
2. Pick **Soul Blueprint** ($179). Click **Book this reading**.
3. Tick the consent boxes, enter name + `yourname+test1@gmail.com`, continue.
4. Walk through the form. Use a real-looking DOB + city. Upload any small image when asked.
5. Hit the review page → click through to Stripe.
6. Pay with the test card.

**Expect:**
- ✅ Redirected to `/thank-you/<id>` with the reading name in the title.
- ✅ **Order Confirmation** email within ~1 minute.
- ✅ Submission appears in Studio → **Submissions** (sort by newest).

**Watch for:**
- ❌ Stripe redirects somewhere other than the thank-you page → screenshot, flag.
- ❌ Email doesn't arrive within 5 minutes → flag.
- ❌ The submission in Studio is missing the photo or any required field → flag.

**Deliver (in Studio):**
1. Open the submission. Upload a short audio file in **Voice note**. Upload any PDF in **Reading PDF**.
2. Set **Delivered at** to now. **Publish**.

**Expect (back as customer, in inbox):**
- ✅ **Day-7 delivery** email arrives within ~1 hour (or ask the maintainer to fire the cron manually).
- ✅ Clicking "Listen to your reading" opens the listen page. Audio plays. PDF downloads.

**Watch for:**
- ❌ Listen page shows "asset trouble" or 404 → the upload didn't land; re-check Studio.
- ❌ Audio is silent or PDF won't open → file upload corrupted.

---

## Journey 2 — Gift purchase, self-send mode

The purchaser forwards the claim link to the recipient themselves. No scheduled delivery.

**As purchaser:**
1. Incognito. Pick **Birth Chart** ($99). Click **Buy as a gift**.
2. Pick **I'll send the link myself** (self-send mode).
3. Fill purchaser name + `yourname+test2@gmail.com`. Tick the 2 consents (Art. 6 + cooling-off — no Art. 9 on the purchaser side).
4. Pay with the test card.

**Expect:**
- ✅ Thank-you page shows the gift variant ("Your gift is ready to share — copy the link below").
- ✅ A **claim URL** is visible on the thank-you page. Copy it.
- ✅ **Gift Purchase Confirmation** email arrives in the test inbox.

**Watch for:**
- ❌ Claim URL is missing from the thank-you page → known production-signal trigger, flag immediately.

---

## Journey 3 — Gift recipient claims (from self-send link)

**As recipient (same incognito or a fresh one):**
1. Paste the claim URL from Journey 2 into the address bar.
2. Page greets the recipient with the purchaser's first name.
3. Enter recipient name + `yourname+recipient@gmail.com`. Tick the 3 consents (Art. 6 + Art. 9 + cooling-off — recipient acks Art. 9 here).
4. Walk through the intake form (same as self-purchase from this point).
5. Submit.

**Expect:**
- ✅ Recipient lands on a thank-you-style page confirming the reading is in progress.
- ✅ **Order Confirmation**-style email arrives in `yourname+recipient`.
- ✅ A new submission appears in Studio with `recipientEmail` populated.

**Watch for:**
- ❌ Claim link errors with "already used" on first click → known bug class, flag.
- ❌ Recipient name greeting is wrong / shows a token like `{recipientName}` → CMS slot didn't substitute, flag.

---

## Journey 4 — Gift purchase, scheduled mode

The site sends the claim link to the recipient automatically at a chosen time.

**As purchaser:**
1. Incognito. Pick **Akashic Record** ($79). **Buy as a gift**.
2. Pick **Schedule the delivery** mode.
3. Fill purchaser name + `yourname+test3@gmail.com`.
4. Fill recipient name + `yourname+recipient@gmail.com`.
5. Pick **send-at** for 5 minutes from now (so you can watch it fire).
6. Optional gift message (~1 sentence). Tick consents. Pay.

**Expect:**
- ✅ Thank-you page shows "Your gift is scheduled for <date/time>".
- ✅ Purchaser inbox: **Gift Purchase Confirmation**.
- ✅ At the scheduled time: recipient inbox gets **Gift Claim** email with the claim link.
- ✅ Recipient clicks → recipient flow (Journey 3 from step 2).

**Watch for:**
- ❌ Claim email doesn't fire within ~5 min of the scheduled time → DO scheduler issue, flag.
- ❌ Recipient gets the email but link is broken → flag immediately.

---

## Journey 5 — Manage a scheduled gift (purchaser edits before send)

**As purchaser** (the test3 email from Journey 4, magic-link auth):
1. Incognito. Go to staging home → click **My Gifts** in the footer (or hit `/my-gifts` directly).
2. Enter `yourname+test3@gmail.com`. **Send sign-in link**.
3. Check inbox → click **Magic Link** email.
4. Authenticated. The page lists the gifts the purchaser bought.

**For the scheduled gift from Journey 4, exercise each action:**

| Action | What to do | What to expect |
|--------|-----------|----------------|
| **View claim link** | Click "Copy claim link" | Link copies; re-shareable with recipient |
| **Edit recipient** | Change name + email → save | Page reflects new recipient; future claim email goes there |
| **Reschedule send-at** | Pick a new date/time → save | Card shows new scheduled time |
| **Cancel auto-send** | Click "Cancel auto-send" → confirm | Gift becomes self-send mode; claim link copyable for manual share |
| **Regenerate claim link** | Click "Regenerate" → confirm | Old link invalidated; new link displayed |

**Watch for:**
- ❌ Any action returns a generic error → screenshot, flag (auth or DO routing issue).
- ❌ The page shows gifts that aren't this purchaser's (cross-user leak) → **CRITICAL**, flag instantly.
- ❌ Cancel-auto-send leaves the gift in "scheduled" state → DO didn't pick up the cancel, flag.

---

## Journey 6 — Listen page magic-link

For the submission from Journey 1 (audio + PDF already delivered):

1. Incognito. Open the **Day-7 delivery** email → click "Listen to your reading".
2. Listen page asks to confirm the email. Enter `yourname+test1@gmail.com`.
3. **Send sign-in link** → check inbox → click the magic link email.
4. Confirm-email page asks for the email again (anti-typo gate). Enter it.
5. Listen page renders. Audio + PDF visible.

**Watch for:**
- ❌ Magic link email doesn't arrive within 1 min → flag.
- ❌ Confirm-email step rejects the right email → flag.
- ❌ Session asked for again after refresh — session should persist for 7 days.

---

## Journey 7 — Privacy export (GDPR Art. 20)

**As customer with an existing session** (continuing from Journey 6, same incognito):
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
2. Fill name + email + message. Complete the Turnstile challenge.
3. Submit.

**Expect:**
- ✅ Success state appears on the page ("Thanks, we'll be in touch…").
- ✅ **Contact Message** email arrives in `hello@withjosephine.com` (the real inbox, not your test address).

---

## Journey 9 — Studio content edits

Quick sanity check that the editorial workflow still works:

1. Studio → pick any landing-page section (e.g. **Hero**).
2. Change the headline. **Publish**.
3. Refresh `staging.withjosephine.com` (incognito, hard refresh).

**Expect:**
- ✅ New headline visible within ~30 seconds (Sanity Live).

**Watch for:**
- ❌ Old text still showing after 2+ min → cache or Live wiring issue, flag.

---

## When done — hand off to the maintainer

You ran the test. Cleanup is **not your job** — D1, Sanity, and R2 deletions are infra operations and a wrong click there can break staging for everyone.

Send the maintainer:

1. **A pass/fail per journey** — "1 ✅ / 2 ✅ / 3 ❌ (screenshot attached: recipient greeting showed `{recipientName}`) / 4 ✅ …"
2. **Screenshots for any ❌** — that's all the troubleshooting you do.
3. **The time window you ran in** — so the maintainer can scope the cleanup script to just the test rows ("ran between 14:00 and 15:30 UTC today").

The maintainer then:

- Runs `scripts/cleanup-test-submissions.mts staging` to wipe the matching D1 + Sanity rows.
- Deletes the test R2 uploads from `withjosephine-booking-photos-staging` via the CF dashboard or `wrangler r2 object delete`.
- Confirms staging is back to a blank baseline before signalling production push.

You don't need access to any of those surfaces.
