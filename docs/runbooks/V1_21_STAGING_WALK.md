# v1.21.0 staging walk

Four walks. Each check sits in the walk that already passes through it. Dex ids in brackets close when their checks pass.

Setup:

- Site: https://staging.withjosephine.com
- Card: `4242 4242 4242 4242`, any future date, any CVC.
- Addresses: buyer `maxgertzen+gift-buyer@gmail.com`; recipient `mgertzen2+gift-recipient@gmail.com` (a different inbox: the send page rejects the buyer's own base); race `mgertzen2+gift-race@gmail.com`. Staging sends only to allowlisted inboxes; any other address is a dry run that still shows "Sent".
- Staging is behind Cloudflare Access: in a new incognito window, log in once, then open email links again.
- Phone width: Chrome DevTools, iPhone 13, touch on.
- Studio: `pnpm studio:dev`, staging workspace.
- Leave the cookie banner unanswered in Walk 1 and Walk 2.

## Walk 1: buy a gift on a phone, open it by link

Incognito, phone width.

1. Homepage, Soul Blueprint card: tap Learn More. The checklist shows; Show Less closes it. [gre931wv]
2. Birth Chart card, Book This Reading. On `/book/birth-chart`:
   - Homepage nav at the top, Back under it. The reading block is folded; open it.
   - Under the promise: the Description. What's included: the same list as the homepage card. How it works: 3 rows, each with a checkmark. Nothing appears twice. [gre931wv]
   - Back returns to the homepage. [renku01k]
3. Notes, open a note, tap its reading link. Back on `/book` returns to the note. [renku01k]
4. On `/book/birth-chart`, type your name or email, then tap a "Not sure this is the one?" link: the "Switched to" notice shows under the nav and above the cookie banner. Switch back. [xhhr3son]
5. Giving or redeeming a gift, Send it as a gift:
   - The sheet slides up; a swipe down closes it. Reopen it.
   - Continue to payment empty shows both errors. Name, a note past 220 characters (counter), tick the box.
   - Continue to payment: "One moment, taking you to checkout." shows above the cookie banner. [xhhr3son]
6. On the Stripe page, copy the URL into a second tab. Pay in the first tab with `+gift-buyer`, then pay in the second tab too. [esd1oud0]
7. Thank-you page:
   - Homepage nav at the top. [h5mu2wey]
   - The code shows on one line on first load. Copy link and Share stack full width. Copy link shows "Link copied ✓" on one line. Edit note, Save note, reload: the new note stays.
8. Stripe test dashboard: the second payment is refunded. [esd1oud0]
9. Buyer email: subject starts with `[Staging]`; it has the code, the link, Share on WhatsApp as an outlined button and Send it by email from Josephine. Every link goes to the site or `wa.me`. The WhatsApp page shows the message with no �.
10. Send it by email from Josephine:
    - Homepage nav at the top. [h5mu2wey]
    - `anna@emailcom`, then your own address: each shows its error.
    - Send to `mgertzen2+gift-recipient@gmail.com`. Reload: "Already sent". Resend once, then "Sent twice already".
11. New incognito, phone width, as recipient: open the "A reading, waiting for you" email, tap Open your gift.
    - Note card at the top, price line "A gift, already paid", no gift row, no "Not sure this is the one?" box.
    - Fill page 1, close the tab, open the link again: "Welcome back. Your answers are saved."
    - Last page: code applied with Remove, "Nothing to pay...", Send my details. Tick the 3 consents, submit. The submit overlay shows above the cookie banner. [xhhr3son]
12. Emails: "Your reading is in my hands now" to `+gift-recipient`, "<name> opened your gift" to `+gift-buyer`, and Josephine's notification at `hello@withjosephine.com` naming the buyer with no amount.
13. Open the gift link again: "This gift was already opened".

## Walk 2: desktop, two more gifts

Chrome desktop, incognito.

1. Buy gift 2 for Birth Chart and gift 3 for Akashic Record with `+gift-buyer`. Skip the checks already done in Walk 1. On `/book` and `/gift/<code>`, Back sits on the price line, its left edge on the box edge.
2. Firefox desktop: open gift 2's thank-you URL. Share is hidden; Copy link pastes `/gift/<code>`.
3. Gift 3: Send it by email from Josephine to `bounced@resend.dev`. (Studio check in Walk 3.)
4. Gift 2 by code:
   - `/book/soul-blueprint`, Redeem gift, a wrong code: the wrong-code line.
   - Gift 2's code: the other-reading line and its button.
   - `/book/birth-chart`, type some answers, Redeem gift with the code in lower case with spaces: `/gift/<code>` opens with the answers kept.
   - `/book/akashic-record`, last page, 6 wrong codes: "Too many tries. Wait a few minutes."
5. Bad codes: `/gift/K7M2` and `/gift/AAAA-BBBB-CCCC` show the same "We couldn't find this gift" page.
6. DevTools, Network, analytics consent given, on `/gift/<code>` and both thank-you pages:
   - `Referrer-Policy: no-referrer` and `Cache-Control: private, no-store, max-age=0`.
   - `noindex` in the HTML.
   - No request to `clarity.ms`.

## Walk 3: Studio as Becky

1. Reading document:
   - Three tabs: Homepage and booking page, Booking page only, Setup. Each field says where it shows. [gre931wv]
   - How it works has the 3 default paragraphs; Expanded Details is gone. [gre931wv]
2. Landing Page, Readings Section: change Learn More button, publish. The homepage card shows the new text. Change it back. [gre931wv]
3. Submissions:
   - Paid awaiting delivery: the Walk 1 recipient reads "email · Gift from <buyer> · Paid ... · Day 1 of 7". Gift fields read-only, no note.
   - 🎁 Gifts not opened yet: gift 3 is listed. Gift 2 and the Walk 1 gift are not.
   - Open gift 3: Payment tab, Gift: From, Bought and Sent by email have values; the Delivery box reads "Waiting for the recipient."
   - ⚠️ Failed sends: gift 3, "Gift email: Bounced" to the recipient, a "Resend gift confirmation to buyer" button, no email address shown. [vmbk83nm]
   - The 6 submissions set to "send requested" this session show "Sent".
4. Booking Flow, Gift Settings: change the price line; Presentation, Gift pages, "opened, with note" shows it. Change it back. The four gift emails are in Booking Flow.
5. Send reading now on the Walk 1 recipient's submission:
   - With no files the button is disabled with its files line. Delivered At is read-only and empty.
   - Upload a test audio and PDF, publish, press it: "Sending now.", then "Sent" within a minute.
   - The delivery email arrives once with `[Staging]`. Delivered At shows the send time; the button is gone.
6. Open the listen link from that email:
   - Homepage nav at the top. [h5mu2wey]
   - The intro card has space above the footer rule. [i2pp0i89]

## Walk 4: last checks

1. Gift 3 race: open its link in two browsers, reach the last page in both. Submit in the first. Submit in the second with `+gift-race`: "This gift was opened a moment ago...". After reload the answers are there, the code is gone and the button reads "Continue to payment".
2. A note with a Notes Plate, desktop: the points line up across the two columns. [xwb7bhto]
3. Phone width, `/book/birth-chart` from the homepage card after Walk 1's saved answers: the reading block stays folded and does not open first.

## After the release

Hosted Studio (`pnpm studio:deploy` from `main`), staging and production workspaces:

- Any email document, Send preview to inbox: the recipient list loads, the preview arrives. [66mhdxuv]
- Staging workspace, a test submission, Delete customer data with the admin token: the cascade summary shows.
- Resend, Domains, `withjosephine.com`: click and open tracking off.
