# Smoke — v1.4.0 (epic 23ctexvw: one-tap delivery + unified library + step-up OTP)

Target: `https://staging.withjosephine.com` (behind CF Access — log in with your allowlisted email first).
Scope: only the **new** Phase 1/2/3 surfaces. Not the full 11-journey `MANUAL_SMOKE_TEST.md`.

---

## 0. Monitoring (already running)

Claude started `wrangler tail --env staging` capturing every worker request to:

```
www/MEMORY/smoke-staging-tail.latest.log   (symlink to the timestamped file)
```

Watch it live in your own terminal while you click:

```
! tail -f www/MEMORY/smoke-staging-tail.latest.log
```

Three data surfaces give you "all data":
1. **wrangler tail** — every request, route, status, console.log/error (the log above).
2. **Sentry** — uncaught errors + breadcrumbs (check after, confirm no leaked `?t=` / OTP).
3. **Gmail inbox** (`hello@withjosephine.com` + your `maxgertzen+…` aliases) — the day-7 email, library button, and the OTP code.

If the tail stops (session expires after a few hours), tell Claude to restart it.

---

## Pre-flight (should already be green — confirm)

- [ ] Staging on Phase 1+2+3 code (deploy from ci.yml run `26457695131`).
- [ ] D1 migrations `0014` `0015` `0016` applied to staging.
- [ ] `AUTH_TOKEN_SECRET` set on staging worker (rotated 2026-05-26).
- [ ] Studio redeployed with Phase 2 tab-label fields (non-blocking — hardcoded fallbacks exist).

---

## J-A — One-tap day-7 delivery (Phase 1)

**Find a deliverable submission** (has voice + pdf):

Run the `--command` on a single line (line breaks inside it become SQL syntax errors):

```
! pnpm exec wrangler d1 execute withjosephine_bookings --env staging --remote --command "SELECT id, status, delivered_at, (voice_note_url IS NOT NULL) AS voice, (pdf_url IS NOT NULL) AS pdf FROM submissions WHERE voice_note_url IS NOT NULL LIMIT 10"
```

**Force the day-7 send.** This path is behind Cloudflare Access, so a raw curl gets a `302` to the IdP login and never reaches the worker. Authenticate the curl with a CF Access token first.

One-time: `brew install cloudflared` then `cloudflared access login https://staging.withjosephine.com`.

Then (replace `<ID>`; `$STAGING_CRON_SECRET` is your staging cron secret — `cf-access-token` clears Access, `Authorization: Bearer` is what the cron route checks):

```
! TOK=$(cloudflared access token --app=https://staging.withjosephine.com); curl -X POST -H "cf-access-token: $TOK" -H "Authorization: Bearer $STAGING_CRON_SECRET" "https://staging.withjosephine.com/api/cron/email-day-7-deliver?force=<ID>"
```

| Step | Expected |
|---|---|
| curl returns | `200` with a small JSON summary (sent count). tail shows `POST /api/cron/email-day-7-deliver 200`. |
| Email arrives | Day-7 "your reading is ready" email with **one primary button**. Recipient-bearer email carries no library button (purchaser-only). |
| Tap the button | Lands on **`/my-readings/welcome`** interstitial (POST-confirm), NOT straight into the reading. |
| Tap Continue | Redirects to **`/listen/[id]?welcome=1`** with the voice note player + PDF link both visible and playable. |
| Token hygiene | URL after landing has **no `?t=` token** left in the address bar. tail shows `POST /api/library/redeem` (or listen-redeem) `303`, then the listen page `200`. |

❌ Fail signals: button drops you straight on `/listen` (interstitial skipped), `?t=` persists in URL, audio/PDF missing, redeem route `4xx`.

---

## J-B — Unified library + redirects (Phase 2)

Sign in via magic link (request from the day-7 email's library button, or `/my-readings`).

| Step | Expected |
|---|---|
| Visit `/my-readings` | Page renders with a **two-tab strip**: Readings + Gifts. |
| Click **Gifts** tab | Shows your gift purchases; URL is **`/my-readings/gifts`**. |
| Visit `/my-readings/gifts` directly | Deep-links straight to the Gifts tab. tail: `GET /my-readings/gifts 200`. |
| Visit legacy **`/my-gifts`** | **308 redirect** → `/my-readings/gifts`. tail: `GET /my-gifts 308`. |
| Tab a11y | Arrow keys move between tabs, `Tab` key reaches panel, `aria-selected` flips (check DevTools). |

❌ Fail signals: `/my-gifts` 404s or 200s without redirect, tabs not keyboard-navigable, gifts tab empty when a gift exists.

---

## J-C — Step-up OTP on high-risk gift mutations (Phase 3)

On `/my-readings/gifts`, with a **scheduled / unclaimed gift** you purchased, trigger **Edit recipient** (or **Send now**).

| Step | Expected |
|---|---|
| Click Edit recipient / Send now | **OTP modal opens** (`role="dialog"`, `aria-modal`). tail: `POST /api/auth/step-up/request 200`. |
| Check inbox | 6-digit OTP email arrives at **your purchaser address** (15-min code TTL). |
| Enter wrong code | Rejected, attempt counted (5-attempt poison). tail: `POST /api/auth/step-up/verify` non-200. |
| Enter correct code | Modal closes, mutation proceeds, elevation set (10-min TTL). tail: `verify 200` then the edit-recipient / send-now request `200`. |
| Re-trigger within 10 min | No second OTP prompt (elevation still valid). |
| Modal a11y | `ESC` closes, backdrop click closes, focus is trapped, input is `inputmode=numeric` + `autocomplete=one-time-code` (DevTools). |
| Throttle | Rapid re-request within 30s → `429 Throttled`; >3 in 30 min → `429`. |

Note: only **edit-recipient** and **send-now** require step-up. The other three gift mutations are intentionally untouched (Council 2). Destructive cancel-scheduled is removed entirely (Phase 4 not yet shipped on this branch).

❌ Fail signals: mutation runs with no OTP prompt, OTP never arrives, correct code rejected, modal not dismissible / focus escapes.

---

## After the smoke

- Skim `www/MEMORY/smoke-staging-tail.latest.log` for any `500` / unhandled rejection.
- Confirm Sentry shows no new errors and **no `?t=` or OTP in breadcrumbs**.
- Report pass/fail per journey + the time window so test rows can be cleaned from staging D1/R2/Sanity.
- Green here closes the Phase 1/2/3 "real-browser smoke" Max-actions in `SESSION_BOOT.md`.
