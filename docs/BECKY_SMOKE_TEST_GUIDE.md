# Becky's Smoke-Test Guide

Hi Becky — this is the walk-through of the website, end to end, that we'll run before flipping it to live. Each "journey" below is a customer story: you click through the way a real visitor would, and you check that the right things happen.

You don't need a developer beside you. If something doesn't match what's written here, take a screenshot of what you see and message Max — that's all the troubleshooting you have to do.

---

## Before you start — open these tabs

| What | Where |
|------|-------|
| The staging website | `https://staging.withjosephine.com` |
| Studio (the editor) | `https://withjosephine.sanity.studio/staging` |
| Your test inbox | The mailbox at `hello+staging@withjosephine.com` (confirm with Max which forwarder this lands in) |

Open the staging website in an **incognito / private window** for the customer journeys — this guarantees you see what a fresh visitor sees, not a cached version.

### Stripe test card

Whenever the journey asks for a card, use:

- Number: `4242 4242 4242 4242`
- Expiry: any month and year in the future (e.g. `12 / 30`)
- CVC: any 3 digits (e.g. `123`)
- ZIP: any 5 digits (e.g. `12345`)

This is the Stripe-provided "always-approves" test card. No real charge is made.

### Admin token (Studio actions)

A few of the Studio actions ("Delete customer data", "Regenerate gift claim link") ask for an admin token. The token is saved in your 1Password vault under **"Josephine — Admin API Key (staging)"**. Copy it when prompted; paste it into the dialog. Don't store it anywhere else.

---

## Journey 1 — A self-purchase booking, end to end

This is the simplest happy-path: a person finds the site, picks a reading, fills the form, pays, gets the receipt email, and (after delivery) gets the audio + PDF.

### What you do

1. Open `https://staging.withjosephine.com` in incognito.
2. Scroll down. Pick **Soul Blueprint** (the $179 reading).
3. Click **Book this reading** (or whatever the button is called on the reading card).
4. You're on the entry page. Tick the four consent boxes, enter your name + your **test inbox** email (`hello+staging@withjosephine.com`), and click continue.
5. Walk through the form pages, filling in any required fields. Use a real-looking birth date and city; if a photo is asked for, you can upload any small image.
6. On the review page, double-check the answers and click the button that takes you to Stripe.
7. Pay with the Stripe test card above.
8. Stripe redirects you back to a thank-you page on the website. **Check the page title** — it should say something like "Thank you" with the reading name. Take a screenshot.

### What should happen in your inbox

- Within a minute or two: **Order Confirmation** email arrives. Subject mentions the reading you picked.
- About **2 days later** (you can ask Max to fire the cron manually if you don't want to wait): a **Day-2 follow-up** email arrives, gently checking in.
- About **7 days later**, once you've delivered (see step below): a **Day-7 delivery** email arrives with a "Listen to your reading" button.

### What you do in Studio to deliver

1. Open Studio (the staging tab). Click **Submissions** in the sidebar.
2. Find the submission you just made (sort by newest — yours is at the top).
3. Upload a short audio file in the **Voice note** field.
4. Upload any PDF in the **Reading PDF** field.
5. Set **Delivered at** to today's date and time.
6. Click **Publish**.

The Day-7 delivery cron will pick this up the next time it runs (or Max can fire it manually).

### What you do as the customer (after the delivery email arrives)

1. Open the Day-7 email in your test inbox.
2. Click the **Listen to your reading** button.
3. The website opens on a "Listen" page with your name, the audio player, and a download link for the PDF.
4. Play the audio for a few seconds. Click the PDF download — confirm a PDF opens.

### ✅ Passed if you see

- Order Confirmation email landed
- Day-2 email landed (after the wait or manual fire)
- Day-7 delivery email landed with a working link
- Listen page opens, audio plays, PDF downloads

### ❌ If it didn't

Take a screenshot of what you DO see (or a screenshot of your inbox showing the missing email), plus the submission row in Studio, and send to Max. No need to retry — Max will pick it up.

---

## Journey 2 — A "self-send" gift (you send the link yourself)

A gift purchaser pays for a reading and decides to forward the claim link to the recipient themselves (e.g. by text or a card on a birthday). This is the path for last-minute gifts where the purchaser doesn't want to put in an email address yet.

### What you do as the purchaser

1. In incognito, open `https://staging.withjosephine.com`.
2. Pick **Birth Chart Reading** ($99). On the reading page, look for the **Gift this reading** link (might be under the main "Book" button).
3. On the gift page, choose **Send myself the link to share**.
4. Fill in **your** details only — name, email (use your test inbox), tick consents. (A recipient name and a short gift message are optional; leave them blank for this run, or add "Test recipient" / "Have a lovely birthday".)
5. Continue to Stripe. Pay with the test card.
6. Stripe redirects you back. **The thank-you page should say something like "We've sent you the shareable link"**. Take a screenshot.

### What should happen in your inbox

- A **Gift purchase confirmation** email arrives. It contains:
  - The reading you bought
  - The amount you paid
  - A big **claim link** — this is what you would forward to the actual recipient

### What you do as the "recipient" (second tab)

1. Open a **second** incognito window (so the recipient is logged-out / separate from the purchaser session).
2. Paste the claim link from the email into the new window.
3. The website opens on a "Claim your gift" page with the purchaser's name + the reading name.
4. Click through to start the intake. Fill in the recipient side of the form (your name, your birth details, etc.).
5. Submit.
6. The recipient's intake completes — you should land on a confirmation page that says the reading is now being prepared.

### What you check in Studio

- Open Studio → Submissions → the gift submission you just made.
- The **Gift status** field should now read **Recipient is preparing** (or wording to that effect).
- The intake answers you filled in on the recipient side are saved.

### ✅ Passed if you see

- Gift purchase confirmation email arrived with the shareable claim link
- Claim link opened a "Claim your gift" page in incognito
- Recipient intake saved into Studio
- Studio status moved from "Ready to share" → "Recipient is preparing"

### ❌ If it didn't

Screenshot the inbox + the Studio status row + the page you're stuck on. Send to Max.

---

## Journey 3 — A scheduled gift (we send the link on a specific date)

A gift purchaser pays now but wants the recipient to receive the claim link on a specific date (e.g. their birthday).

### What you do as the purchaser

1. In incognito, `/book/akashic` (the $79 reading). Click **Gift this reading**.
2. On the gift page, choose **Schedule for a specific date and time**.
3. Fill in **your** details: name, email (test inbox), consents.
4. Fill in the **recipient** details: their name, their email. Pick a "send at" date and time that's only **2 to 5 minutes** in the future (so you don't have to wait long for this test).
5. Optionally add a gift message.
6. Continue to Stripe. Pay with the test card.
7. Stripe redirects back. **The thank-you page should mention the date you scheduled**.

### What should happen in your inbox immediately

- A **Gift purchase confirmation** email arrives. This one is slightly different from the self-send variant — it tells you the date the recipient will receive their link. **It should NOT contain a claim link** (the recipient gets the link, not the purchaser).

### What should happen at the send-at time

- At the time you scheduled, the **recipient** (whose email is your test inbox, since you're playing both roles) receives a **Gift claim** email with the actual claim link.
- If the time has come and gone and no email arrived within ~2 minutes of the scheduled time, screenshot the Studio row and ping Max.

### What you do as the "recipient"

1. Click the claim link in the new email.
2. Complete the intake on the recipient side.
3. Land on confirmation.

### What you check in Studio

- The gift submission's status moves: **Scheduled** → (at send-at time) **Recipient invited** → (after intake) **Recipient is preparing**.

### ✅ Passed if you see

- Purchase confirmation email with scheduled date (no claim link)
- Claim email arrives at the recipient at the scheduled time
- Recipient intake completes
- Studio status moves through the three states

### ❌ If it didn't

Screenshot Studio status + your inbox at the relevant moments. Send to Max.

---

## Journey 4 — A repeat customer returning to listen

After a reading has been delivered, the customer can come back to the website any time and re-open it from `/my-readings`. This is the "I lost the email, where do I find my reading" recovery path.

### What you do

1. Use the test inbox email you used in **Journey 1** (the customer who already has a delivered reading).
2. Open `https://staging.withjosephine.com/my-readings` in incognito.
3. Enter the email.
4. The page says "Check your inbox for a link" or similar.
5. Open your test inbox — a **Sign-in link** email arrives.
6. Click the link.
7. You land back on `/my-readings`, this time logged in. You see your reading listed.
8. Click **Listen** (or the reading title).
9. You arrive on the Listen page for that reading.

### ✅ Passed if you see

- Sign-in link arrives in inbox
- Clicking the link logs you in
- Your previously-purchased reading is listed
- Listen page opens correctly

### ❌ If it didn't

Screenshot the page where it failed + your inbox. Send to Max.

---

## Journey 5 — A gift purchaser managing their gifts

After buying a gift, the purchaser can manage it from `/my-gifts`. Three sub-flows to test.

### Sub-flow 5a — Edit recipient email on a scheduled gift (before the send-at time)

Use a **scheduled gift** you bought in Journey 3 where the send-at time **hasn't fired yet** (so go schedule a new gift with a send-at 30 minutes out before this sub-flow).

1. In incognito, open `/my-gifts`. Enter your test inbox email (the one you used as purchaser).
2. A sign-in email arrives. Click the link.
3. `/my-gifts` lists your gifts.
4. Find the scheduled gift, click **Edit recipient**.
5. Change the email address to something slightly different (e.g. `hello+staging2@withjosephine.com`).
6. Submit.
7. The page confirms the change.
8. In Studio, the recipient email on that submission has updated.

✅ Passed if: Studio reflects the new recipient email, no error shown.

### Sub-flow 5b — Resend the link on a self-send gift

Use a **self-send gift** you bought in Journey 2.

1. From `/my-gifts` (signed in), find the self-send gift.
2. Click **Resend the link** (or **Resend claim email**).
3. The page confirms.
4. Your test inbox receives a **fresh claim email** with a **new claim URL**.
5. Try the **old** claim link from Journey 2 — it should NOT work any more (it's been invalidated). The new one works.

✅ Passed if: new email lands with a new link; old link is dead.

### Sub-flow 5c — Cancel auto-send → switch to self-send

Use a **scheduled gift** that hasn't fired yet (schedule one fresh with send-at 30 minutes out).

1. From `/my-gifts` (signed in), find the scheduled gift.
2. Click **Cancel scheduled send and send me the link instead** (or wording to that effect).
3. The page confirms.
4. Your test inbox (the purchaser) receives a **claim email with a claim link** — same format as Journey 2's self-send confirmation.
5. In Studio, the gift's delivery-method field has flipped from **Scheduled** to **Self-send**.

✅ Passed if: purchaser gets the link by email; Studio flips delivery method.

### ❌ If any 5x sub-flow failed

Screenshot the action you tried, the Studio row, and your inbox. Send to Max.

---

## Journey 6 — Contact form

A visitor sends a message via the contact form.

### What you do

1. In incognito, open `https://staging.withjosephine.com/#contact` (or wherever the contact section is — it might be a section on the homepage rather than its own page).
2. Fill in **From** name, **Reply-to** email (e.g. a personal email of yours, NOT the test inbox — this is what Josephine would reply TO if she replied to your test message), and a short **Message**.
3. Submit.
4. The page confirms (something like "Thanks — we'll be in touch").

### What should happen

- Your **test inbox** (`hello+staging@withjosephine.com`, where the contact-form notification lands) receives a **Contact-form notification** email. The "From" appears to be the form sender; the "Reply-to" is the email they entered. The body contains the message.

### ✅ Passed if you see

- Page confirmation shown
- Notification email lands in test inbox with the message body intact

### ❌ If it didn't

Screenshot the form state + your inbox. Send to Max.

---

## Journey 7 — Studio admin recovery: regenerate a gift claim link

If a gift's claim link gets lost (purchaser forwarded it to the wrong person, email got buried, etc.), you can regenerate it from Studio. The old link stops working; a fresh email goes out.

### Setup

You need a gift submission that is **NOT yet claimed** and **NOT cancelled**. Use any gift from Journey 2 or 3 where the recipient hasn't completed intake yet.

### What you do

1. Open Studio → Submissions.
2. Find the gift submission. Open it.
3. In the document actions (usually a kebab `⋯` menu top-right, or a button row above the document), click **Regenerate gift claim link**.
4. A confirmation dialog appears, warning that "this invalidates the previous link" and telling you which party will receive the new one (purchaser for self-send, recipient for scheduled).
5. Paste the **admin token** from 1Password into the dialog.
6. Click **Regenerate and send**.

### What should happen

- The dialog closes. Studio shows a success message.
- The appropriate inbox (purchaser for self-send, recipient for scheduled) receives a **fresh claim email** with a new URL.
- The **previous claim URL** stops working — visiting it shows a "link no longer valid" page (or similar).

### ✅ Passed if you see

- New email arrives at the right party
- Old link is dead, new link works

### ❌ If it didn't

Screenshot the Studio dialog state + your inbox + the page you tried the old link on. Send to Max. **Important**: don't reuse the admin token by trying again — Max needs to investigate first.

---

## Journey 8 — GDPR cascade delete: removing a customer's data

If a customer asks us to delete everything we hold about them (GDPR right-to-erasure), you can run the cascade delete from Studio. This is **irreversible** — only use it on test-data submissions.

### Setup

Pick a test submission from one of the previous journeys (NOT a real customer's data). The submission should be one you don't mind wiping.

### What you do

1. Open Studio → Submissions → open the submission you want to delete.
2. In document actions, click **Delete customer data**.
3. A confirmation dialog appears. It asks you to:
   - **Type `DELETE`** in the input box (exactly, all caps)
   - **Paste the admin token** from 1Password
4. Click **Confirm permanent deletion**.

### What should happen

- The dialog closes. Studio shows a success message.
- The submission **disappears from the Submissions list**.
- The submission also disappears from the database (you don't see this; Max can confirm).
- The photo (if there was one) is removed from storage.
- A deletion log entry is written (Max can see this in the deletion log).

### ✅ Passed if you see

- Submission disappears from Studio
- Page redirects you back to the Submissions list

### ❌ If it didn't

Screenshot the dialog + the Studio state after. Send to Max. Don't retry — this is the kind of operation you only do once per submission.

---

## What "all green" looks like

When every journey above closes with a ✅, you're done. Send Max a thumbs-up (or this doc with checkmarks next to each Passed) and we're cleared to flip the website live.

If anything is ❌, that's fine — we'd much rather find it now on staging than after launch. Send Max the screenshots and we'll fix it together before the flip.

Thanks for doing this, Becky. You're the last line of defence before real people see this. 🤍
