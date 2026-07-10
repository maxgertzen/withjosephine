# How the site actually handles data (for the privacy policy rewrite)

**For:** Becky (and her AI assistant)
**Date:** 2026-07-07

## What this is

The privacy policy currently published on withjosephine.com is **out of date**. It describes an older version of the site that no longer exists (it mentions Gmail, Google Drive, Google Forms, deleting readings after 30 days, and 7-year payment records). None of that is how the site works now.

This document lists what is **actually true** today. Hand it to your AI and ask it to rewrite the privacy policy so it matches reality. Everything below has been checked against the live system.

---

## The facts (what to write the policy around)

### Who runs it
Josephine is the only person. There is no team. She is the sole data controller.

### What is collected
- **Name and email** — given when someone books.
- **Reading details** — submitted through the intake form after booking:
  - Birth Chart: date, time, and place of birth (no name, no photo).
  - Akashic Record: full name and a recent eyes-open photo.
  - Soul Blueprint: both of the above.
- **Payment info** — handled entirely by Stripe. Josephine never sees the card number, CVV, or full billing address. She only sees that the payment happened and the email used at checkout.
- **Basic technical data** — IP address, browser, referrer, logged for spam/abuse protection.
- **Anonymous usage analytics** — see "Analytics and cookies" below.

### Why it's collected
Only to create and deliver the reading, to contact the customer about it, and to meet tax/accounting rules. Never sold, rented, or used for advertising.

### Where the data lives (the services used)
| Service | What it does |
|---|---|
| **Stripe** | Processes payments |
| **Cloudflare** | Hosts the site, DNS, email routing, spam protection, and stores the uploaded Akashic photo |
| **Sanity** | Runs the site content, and securely stores the reading itself: the intake answers, the voice note, and the PDF |
| **Resend** | Sends Josephine's booking and admin emails |
| **Brevo** | Sends customer emails and the newsletter (EU-based) |
| **Mixpanel** | Anonymous analytics (never receives name, email, photo, or birth details) |
| **Microsoft Clarity** | Anonymous session analytics (form entries are hidden before anything is recorded) |
| **Sentry** | Error monitoring, so faults can be diagnosed |

**Do NOT mention these** (they are in the old policy but no longer used): Gmail, Google Drive, Google Forms, Web3Forms, Cloudflare Pages.

### How long data is kept
- **The reading** (intake answers, voice note, PDF, and the Akashic photo) — kept up to **3 years** from booking, then deleted, unless the customer asks sooner.
- **Reading link** — after delivery, the voice note and PDF stay reachable from the unique link for **90 days**, then the link expires. Emailing hello@withjosephine.com gets it re-issued while the reading is still held.
- **Uploaded photo** — removed from image storage within **90 days** of payment.
- **Payment records** — kept **6 years** for UK tax/accounting. On a deletion request, the identifying details are removed but the minimal transaction record is kept as legally required.
- **Intake forms that never lead to payment** — deleted within about **30 days**.
- **Contact-form messages** — deleted once the enquiry is resolved.

### Analytics and cookies
- No advertising cookies, no ad pixels, no social-media tracking.
- Two privacy-preserving analytics tools run: **Mixpanel** (anonymous funnel) and **Microsoft Clarity** (anonymous sessions, form entries masked).
- Visitors in the EU/EEA, UK, Switzerland, or California see a **consent banner**, and nothing analytics-related runs until they accept.
- The old policy says "no analytics cookies" — that is **wrong** and must be corrected.

### International access
Josephine works remotely and may access data from outside the UK/EEA. Some services are US-based (Stripe, Sanity, Mixpanel, Microsoft) and operate under the EU-US / UK Data Privacy Framework and Standard Contractual Clauses. Sentry uses an EU region. Data is not stored long-term on personal devices.

### Rights
Customers can ask to see, correct, delete (subject to the retention rules above), or stop the use of their data. All requests go to hello@withjosephine.com; Josephine responds within 30 days. Readings are for adults 18+.

---

## Quick summary of what the old policy gets wrong

1. Says readings are stored in **Gmail / Google Drive** — actually **Sanity + Cloudflare**.
2. Says readings are **deleted 30 days after delivery** — actually kept **3 years**.
3. Says payment records kept **7 years** — actually **6 years**.
4. Says **no analytics cookies** — actually Mixpanel + Clarity (consent-gated).
5. Missing: Microsoft Clarity, Sentry, Brevo, and the consent banner.
