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

> **Base must be the allowlisted address.** On staging, the base (the part before `+`) must be the exact dotless address that appears on the staging `ALLOWED_PREVIEW_RECIPIENTS` / non-prod email allowlist. Use the canonical form with no dots; a dotted variant (`your.name@…`) or any other base is a different key and staging sends fail closed via `env_guard`, so the email silently never arrives. Plus-suffixes are fine; the base is what the allowlist matches.

| Suffix | Role | Used in |
|---|---|---|
| `+self` | Self-purchase customer | Cluster A |
| `+gift-buyer` | Gift buyer | Cluster B |
| `+gift-recipient` | Gift recipient | Cluster B |
| `+gift-race` | Second recipient for the race | B8 |

Add a date suffix (e.g. `+self-20260520`) if you want to tell smoke rounds apart.

**Two roles:**
- **Customer / recipient:** incognito browser, your test Gmail.
- **Becky (Josephine):** Sanity Studio editor. The Becky steps happen after a customer submits and require switching to Studio.

**Maintainer force-cron helper:** `bash scripts/force-cron.sh <route> <submissionId>` (defaults to staging, append `--prod` for production). One-time setup: `brew install cloudflared` then `cloudflared access login https://staging.withjosephine.com`.

---

## ▶ v1.11.0 release→main gate smoke (RUN THIS FIRST — next session entry point)

**Status as of 2026-06-18:** all v1.11.0 work is merged to `release/v1.11.0` (HEAD `ff0cb22`) and deployed to staging; PR **#291** (release→main) is green + gate-reviewed **SHIP**. This focused pass is the only thing between here and the production merge. The original 4 smoke-fix PRs (#295–#298) were already smoked OK by Max; the **two new additions (#299 Library link, #300 self-booking email lock) are un-smoked** — they reached staging only via the release pushes. Scope is the v1.11.0 deployed delta (per `feedback_smoke_scope_to_deployed_delta`), with explicit regression checks on the surfaces v1.11.0 touched plus one core happy-path.

Staging is `https://staging.withjosephine.com` (behind CF Access; staging Stripe is **test mode**, so test card `4242 4242 4242 4242` is safe here — do NOT run a paid walk on prod, live links). To get a signed-in session: open the sign-in form on `/my-readings` (or any `/listen/<id>` page), enter your allowlisted base email, click the magic link (staging sends real mail to allowlisted addresses), land authed.

**On completion → the merge sequence is at the bottom of this section.**

### G1 — NEW: self-booking email lock (#300) + Library link (#299)
1. **Signed-out** incognito → `/book/soul-blueprint/intake`: email field is **editable**; **no** "send it as a gift" nudge. ✅ regression: anonymous booking unchanged.
2. Sign in (magic link, above).
3. **Header (signed in):** a **"Library"** link is present → clicking goes to `/my-readings`. ✅ (#299)
4. **Signed-in** → `/book/soul-blueprint/intake`: email field is **prefilled with your account email and read-only**; nudge reads **"Signed in as <you>… Booking for someone else? Send it as a gift"** → links to `/book/soul-blueprint/gift`. ✅ (#300)
5. **Locked-email authority regression:** while signed out, start an intake draft with a *different* email + a name, "save for later"; then sign in and reopen the same intake. The email must show your **session** email (locked), not the stale draft email; the **name** should still restore from the draft. ✅ (`lockedValues` merge)
6. **Gift-flow regression (shared `prefilledEmail` mechanism):** `/book/soul-blueprint/gift` still lets you enter a **different recipient** email (not locked). And a scheduled-gift recipient redeem still pre-fills + locks the recipient's email (covered deeper in Cluster B/C). ✅

### G2 — NEW + regression: listen surface (#295)
On a delivered `/listen/<id>` (use Cluster A's flow to produce one, or an existing delivered reading):
1. **NEW:** an explicit **"Download voice note"** button renders beside the native player; clicking downloads the audio. **Test in Firefox** specifically (the reason it exists — Firefox's native player has no download). ✅
2. **NEW:** the **welcome ribbon persists** — it does NOT auto-vanish after ~6s (wait 10s, still visible). ✅
3. **NEW:** birth-time picker (intake, `/book/birth-chart/intake`) offers **every minute 00–59**, not just :00/:05/:10. ✅
4. **Regression:** audio still **plays**; the **PDF download** link still works; `listenedAt` still records (Becky sees it in Studio after a listen).

### G3 — regression: intake submit pending (#296)
1. On the final intake page, click **Submit**: the button reflects **pending/disabled immediately** (no dead beat before the Turnstile/redirect). ✅
2. **Regression:** trigger a validation/consent failure on submit → the button **re-enables** (not stuck disabled); a valid submit proceeds to Stripe.

### G4 — regression: reading copy + names (#298)
1. Reading cards/titles show **bare** names: "Soul Blueprint", "Birth Chart", "Akashic Record" (not "The …"). ✅
2. Sentence/customer copy reads "…your Soul Blueprint **reading**…" (noun appended in copy, not in the bare name).
3. Open one email (Order Confirmation or Reading Delivery) — bare name + "reading" renders correctly, no double-noun / leading-article.
4. **Migration note:** code defaults are bare; **live Sanity overrides need `scripts/migrate-readingname-append-reading-2026-06-16.ts`**. Confirm staging renders correctly (run the migration on staging if any surface still shows old copy); **prod migration is owed at merge** (see sequence below).

### G5 — regression: Studio (#297) — PARTIAL, read the caveat
- **Submission preview labels:** in Studio (`https://withjosephine.sanity.studio`), a **claimed gift** submission shows **"Purchaser … · Recipient …"** (not the bare purchaser email). ✅
- **⚠ Send-preview is KNOWN-BROKEN on the hosted Studio** (cross-origin "Failed to fetch", deferred — dex `66mhdxuv`). Do **not** spend time smoking "Send preview to inbox" here; it can't pass on `*.sanity.studio` until that ticket lands. The token-drop code itself is unit-tested.

### G6 — core happy-path regression (critical path #296/#300 touch it)
Run one full **staging** booking end-to-end (test card `4242…`): `/book/<reading>` → letter → intake → pay → `/thank-you/<id>` → (Becky delivers) → magic link → `/listen/<id>`. Confirms the synchronous-submit (#296) and email-lock (#300) changes didn't regress the paid path. (This overlaps Cluster A — if you run Cluster A, G6 is covered.)

### ✅ When this gate passes → production merge sequence
1. **Re-confirm `osv-scan` is still green** on #291 (a fresh CVE wave has landed two days running): `gh pr checks 291`. If red, fix deps first (pnpm@10 override + regen, see CHANGELOG "Shared" rows).
2. **Merge #291** (release→main) → this deploys to **production**.
3. **Tag `v1.11.0`** + add the v1.11.0 release entry to `CHANGELOG.md`.
4. **Run the gate migrations staging→prod** (after Day-7 queue drain): `migrate-readingname-append-reading-2026-06-16.ts` (#298), `migrate-strip-title-articles-2026-06-12.ts` (B, prod), `migrate-gift-confirmation-library-copy-2026-06-12.ts` (L2), + privacy-policy `legalPage` Sanity copy (export mention).
5. **M1 follow-up** (dex `7h6tfse1`): confirm `/api/admin/send-email-preview` is under the WAF rate-limit rule now #297 dropped its token (defense-in-depth; not blocking the merge).
6. **Branch cleanup:** `release/v1.9.0`, `release/v1.10.0`, `release/v1.11.0`.

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

### A2: Becky delivers + Studio reading delivery email schema audit

**As Becky (in Studio):**
1. Open the submission from A1. The **audit trail** shows consent timestamps + IP-hash + request UA-hash entries. Eyeball that they are present.
2. Upload a short MP3 in **Voice note** (~30s, under 5MB).
3. Upload any PDF (~1 page) in **Reading PDF**.
4. **Publish**. **Delivered at** is read-only and stays empty until the delivery email is sent.
5. Open **Emails > Reading Delivery Email → Customer** in the Studio sidebar (v1.4.0 J13e). Confirm visible fields are: `subject`, `preview`, `bodyIntro`, `bodyPostButton`, `buttonLabel`. Legacy fields (`greeting`, `lineReady`, `comfortLine`, `signedInDisclosure`, `accessWindowLine`, `comfortFollowUp`) should NOT be visible.

### A3: Reading delivery force-send, one-tap, listen page, remember-me

**As maintainer:** force the reading delivery for the A1 submission (replace `<id>`):
```
bash scripts/force-cron.sh deliver-reading <id>
```
Expected response: `{"processed":1,"sent":1,"skipped":0,...}`.

**As customer (in `+self`):**
1. Reading delivery email arrives. Subject reads "Your <reading-name> is ready" (verify no leading "The"). Body uses the one-tap copy: "Tap below to open your reading. You will be signed in for the next seven days..." (v1.4.0 J13a). Single CTA, no em-dashes.
2. Tap the CTA. Land on `/my-readings/welcome?t=<lib-token>` with heading "Welcome to your library." and CTA "Continue to your library."
3. Tap **Continue**. Land on `/my-readings?welcome=1`. Reading card visible under **Mine** with an **Open your reading** CTA.
4. Click **Open your reading**. Land on `/listen/<id>`. Audio plays in full. PDF downloads and opens. Filename is human-readable: firstname + lastname + reading name, **space-separated, casing echoed verbatim** from the name fields (no hyphens/underscores, no app re-casing), e.g. `Jane Doe Soul Blueprint.pdf` (v1.11.0 K, #285; contract: `buildListenFilename` in `src/app/api/listen/[id]/downloadFilename.ts`). NOT the submission UUID. If the in-page loader hangs you can't reach the download — that's a BLOCK, not a pass.
5. Confirm top-bar visible on `/listen/<id>`, `/my-readings`, `/my-readings/welcome`: ✦ Josephine wordmark on left; on the authed routes the right side shows the **owner email + Sign out** control. The old standalone "Home" link was removed in v1.11.0 (E) — the wordmark is the sole home affordance.
6. Hit the browser **back** button after step 3. The interstitial does NOT restore from bfcache with the consumed token in the URL. The URL stays clean: no `?t=...` reappears (v1.7.0 J15a).
7. Open the same listen URL in a second incognito window (different session). Site shows "This link has rested" form. Submit the email. A fresh email arrives — subject "Open your reading" (separate template from the reading delivery email; per F7 the relationship to J13d "Sign in to your library" is a TBD spec question). Tap the CTA. Land on `/listen/<id>?t=<fresh-token>` with heading "Welcome, your reading is here." and CTA "Continue to your reading." Tap, land on `/listen/<id>`.
   - Magic-link body greeting substitutes the user's actual first name, not literal `{firstName}` (v1.5.0 J12b).
8. In that second window, close the listen tab and reopen `/listen/<id>` directly (within 7 days of step 7). The page renders. It does NOT show "This link has rested" (7-day session persistence promise).
   - **Rested-bypass (v1.11.0 C, #287):** while signed in (valid session), append `?error=rested` to the listen URL. The reading must render normally — a valid session OUTRANKS the stale `?error=rested`; the "This link has rested" card must NOT show. (Pre-fix, a re-clicked/consumed link wrongly rested an already-signed-in user.) `?error=rested` is the deterministic trigger; the consumed-link path is an ambiguous secondary.
9. Visit `/listen/<id>` with an obviously consumed token. Confirm the rested page renders with no em-dashes in heading or body (v1.10.0 J17d /listen rested).

**Routing summary (the two welcome interstitial paths):**
- Original reading delivery email CTA → `/my-readings/welcome?t=...` ("Welcome to your library") → `/my-readings` library → user picks a card → `/listen/<id>`.
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

## Cluster B: Gift (v1.21.0)

Each journey runs once at 375px (Chrome DevTools) and once on desktop.

### B1: Buyer, fold row to thank-you

**As buyer (incognito):**
1. Open `/book/birth-chart`. The "Giving or redeeming a gift" row sits inside the form card, right before "Before I read for you". Tap it. Both lines show.
2. Tap **Send it as a gift**. Tap **Continue to payment** empty: both errors show.
3. Type a first name and a note past 220 characters: the counter shows; past 260 it turns rose. Tick the checkbox.
4. **Continue to payment**: "One moment, taking you to checkout." Pay with the test card and `yourname+gift-buyer@gmail.com`.

**Expect:**
- The thank-you page shows the code on first load, Copy link, Share and the note.
- Copy link shows "Link copied ✓". **Edit note**, change it, **Save note**: the callout shows; reload keeps it.
- On a real phone, Share opens the device share menu with the share message and the link.
- The buyer confirmation email arrives in `+gift-buyer` with the code, the link, Share on WhatsApp and **Send it by email from Josephine**.

**Watch for:**
- A page without the code that fills in later.
- `{placeholder}` literals. Horizontal scroll at 375px.

### B2: Browser with no share menu

**As buyer (Firefox desktop):** open the B1 thank-you URL. Share is hidden. Copy link works and pastes `/gift/<code>`.

### B3: Send by email from Josephine

**As buyer:** tap **Send it by email from Josephine** in the B1 email.
1. Try `anna@emailcom`, then your own address: each shows its error.
2. Send to `yourname+gift-recipient@gmail.com`: the sent state shows.
3. Reload: "Already sent", and the page source holds no recipient address.
4. Use the resend once; then "Sent twice already".

**As recipient (`+gift-recipient`):** "A reading, waiting for you" arrives with the note card, **Open your gift**, the code line and the privacy line.

### B4: Recipient by link

**As recipient (fresh incognito):**
1. Tap **Open your gift**. Note card at the top of the form card, price line "A gift, already paid", no gift row, no "Not sure this is the one?" box, page line ending "· a gift from" the buyer.
2. Fill page 1, close the tab, open the link again: "Welcome back. Your answers are saved."
3. Last page: code applied with Remove, "Nothing to pay...", the line about the "gift opened" email, **Send my details**. Tick the 3 consents, submit.

**Expect:**
- The gift thank-you page and "Your reading is in my hands now" in `+gift-recipient`.
- "<name> opened your gift" in `+gift-buyer`.
- Josephine's notification at `hello@withjosephine.com` names the buyer and shows no amount.
- The gift link again: "This gift was already opened". The B3 send link: the opened lines.

### B5: Recipient by code

**As recipient (desktop), with a second paid gift:**
1. `/book/soul-blueprint`, **Redeem gift**, a wrong code: the wrong-code line.
2. The Birth Chart code: the other-reading line and its button.
3. On `/book/birth-chart`, type some answers, then **Redeem gift** with the code in lower case with spaces: `/gift/<code>` opens with the answers kept.
4. On `/book/akashic-record` last page, type 6 wrong codes in the code field, pressing **Continue to payment** each time: "Too many tries. Wait a few minutes." After a minute a correct code works.

### B6: Becky

**As Becky (`pnpm studio:dev`, staging workspace, before the release; deployed Studio after it):**
1. Paid awaiting delivery: the B4 submission reads "email · Gift from <buyer> · Paid ... · Day 1 of 7".
2. Open it: gift fields read-only, no note.
3. 📬 Submissions, 🎁 Gifts not opened yet: the B5 gift is listed as "Gift from <buyer> · Birth Chart Reading · Not opened yet · Bought <date>". The B4 gift is not in this list.
4. Open the B5 gift: Payment tab, Gift: "From", "Bought" and "Sent by email" have values. The Delivery box reads "Waiting for the recipient."
5. Pages, Booking Flow, Gift Settings: change the price line; Presentation, Gift pages, "opened, with note" shows the change. The four gift emails are in Booking Flow, not in Emails.
6. Send a fresh paid gift to `bounced@resend.dev`. ⚠️ Failed sends lists the gift. Its Delivery box shows "Gift email: Bounced" to the recipient and a "Resend gift confirmation to buyer" button. No email address is shown.

### B7: Resend tracking

In the buyer and recipient emails, every link points straight at the site or `wa.me`. Resend dashboard, Domains, `withjosephine.com`: click tracking and open tracking are off.

### B8: Two people open the same gift

**As recipient:** open one gift link in two browsers and reach the last page in both. Submit in the first. Submit in the second with `+gift-race`.

**Expect:** the second shows "This gift was opened a moment ago..."; after reload its answers are there, the code is gone, the price line is the normal one and the button reads "Continue to payment".

### B9: Bad codes, headers, analytics

**As anyone (desktop Chrome, DevTools open, analytics consent given):**
1. `/gift/K7M2` and `/gift/AAAA-BBBB-CCCC`: the same "We couldn't find this gift" page.
2. Network tab on `/gift/<code>`, a reading thank-you and a gift thank-you: `Referrer-Policy: no-referrer`, `Cache-Control: private, no-store, max-age=0`, `noindex` in the HTML.
3. No request to `clarity.ms` on `/gift/<code>` or any `/thank-you/` page.

---

## Cluster C: Privacy export

Covers v1.0 baseline (J7 privacy export), v1.5.0 privacy export substitution (J12c).

### C5: Privacy export (GDPR Art. 20)

**As any signed-in customer (continuing from A3):**
1. Navigate to `/my-readings`. Click the self-service **Export my data** button (v1.11.0 D, #290). Confirm.
   - Happy path: request accepted (202), UI confirms it's processing.
   - Click it again immediately: the UI surfaces the **429** (already-requested / try-later) state gracefully, no crash. (413 = payload-too-large, only with an oversized export; N/A otherwise.)

**Expect:**
- **Privacy Export** email arrives with a download link. Subject + body greeting substitute `{firstName}` to the user's actual first name (v1.5.0 J12c).
- Link downloads a `.zip` containing the submission data (JSON + photos).

**Watch for:**
- Empty / wrong submission data in export.
- 404 on download link.
- Literal `{firstName}` in subject or body (allowlist mismatch in `emailPrivacyExport`).
- 429 throwing an unhandled error instead of a friendly message.
- A missing export email may be **env-guard suppression** on the async DO/cron path, not a 404 (see `feedback_resend_dry_run_paths`) — check the worker / D1 before reporting a fail.

---

## Cluster D: Admin / Studio surfaces

Covers v1.0 (J9 Sanity Live edits, J11 admin emails consolidation), v1.5.0 (J12a send preview, J12d Used-on), v1.6.0 (J14h dex auto-close observational), v1.21.0 (D4 Send reading now).

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

Repeat on at least 2 other email singletons (e.g. **Reading Delivery Email**, **Gift Claim**).

### D3: dex auto-close (observational, no walk)

This fires on the next PR-to-main merge that includes `Closes/Fixes/Resolves dex <id>` in body or commit message. Not a smoke beat; check **Actions tab > dex-auto-close workflow run** after the next merge.

### D4: Send reading now

**As Becky:** on a paid submission with no files, **Send reading now** is disabled with its files line. **Delivered At** is read-only and empty. Upload both and publish: the ready line names the email. Press it: "Sending now." Within a minute: "Sent", the delivery email arrives once, **Delivered At** shows the send time, and the button is gone. Nothing is sent before the button is pressed, however many days pass. Use an allowlisted address: a sandbox address is a dry run and sends nothing. (Max 2026-10-04) With the wake blocked (DevTools, block `/api/delivery/wake`), the toast is "Saved. It sends within 15 minutes." and the 15-minute `deliver-requested` run sends it. (Max 2026-10-05)

---

## Cluster E: Defensive + a11y + mobile + env-guard

Covers v1.0 (J10 mobile viewport), v1.4.0 (J13f new-device notice), v1.6.0 (J14a hero a11y, J14c hydration check on /my-readings (folded into C2), J14e custom 404 + under-construction, J14f Resend env_guard).

### E1: Mobile viewport (375 to 390px)

Run these at mobile width in Chrome DevTools (iPhone 13):

1. **Landing page**: Hero renders, no horizontal scroll, CTA button tappable, footer reachable.
2. **A1 first page**: Reading selector tappable, consents check correctly, form fields don't overflow.
3. **B4 gift link**: on `/gift/<code>` the note card, the price line and the intake fields don't overflow.

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
| v1.11.0 (listen rested-bypass, listen filename, library identity+sign-out, export UI, gift Stripe prefill, gift copy, gift Day-7 routing) | A, B, C, D, E | A3.4 (K #285 human-readable filename), A3.5 (E #289 owner-email + Sign out top-bar, no Home link), A3.8 (C #287 rested-bypass with valid session), C5 (D #290 "Export my data" 202/429 UI), B1 (F #288 gift Payment Link email prefill + L #286 "your library" copy), B3 / C4 (A/F14 #279 gift Day-7 delivery routes to RECIPIENT not purchaser — the CRITICAL fix; cross-user-leak check), E5 (#279-unblocked new-device notice), D2 (#279-unblocked send-preview end-of-flow). **To run only the v1.11.0 delta:** walk A3 + C5 + B1 + B3 + C4 + E5 + D2, plus the E top-bar at C2; everything else is regression-glance. |
| v1.11.0 smoke-fixes + late adds (#295–#300) | gate section (G1–G6) | **Run the "▶ v1.11.0 release→main gate smoke" section at the top of this doc.** Covers #295 listen (audio download / persistent ribbon / all-minute time picker — G2), #296 intake synchronous-submit (G3), #297 Studio Purchaser/Recipient labels + send-preview caveat (G5), #298 bare reading names + "reading" copy + migration (G4), **#299 Library link (G1.3)** and **#300 signed-in self-booking email lock + lockedValues authority (G1)**, plus core happy-path regression (G6). This is the pre-merge gate for #291. |
| v1.21.0 (gift flow, Send reading now) | B, D | B1 to B9, D4 |

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

1. **A pass/fail per beat**: "A1 ✅ / A2 ✅ / A3 ❌ (screenshot: reading delivery email didn't arrive) / B1 ✅ / B2 ❌ ..."
2. **Screenshots for any ❌**: that's all the troubleshooting you do.
3. **The time window you ran in**: so the maintainer can scope the cleanup script ("ran between 14:00 and 15:30 UTC today").

The maintainer then:

- Runs `scripts/cleanup-test-submissions.mts staging` to wipe matching D1 + Sanity rows.
- Deletes test R2 uploads from `withjosephine-booking-photos-staging` via the CF dashboard or `wrangler r2 object delete`.
- Reverts any Studio edits from B6 step 4, D1, or E3 step 5.
- Confirms staging is back to a blank baseline before signalling production push.

You don't need access to any of those surfaces.
