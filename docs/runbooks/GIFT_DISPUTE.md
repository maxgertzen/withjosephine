# Gift Dispute

A buyer opens a dispute on a gift payment in Stripe. The app has no dispute handler, so the maintainer runs these steps on production by hand.

## What this covers

- A dispute before the gift is opened: the gift is cancelled in D1.
- A dispute after the gift is opened: the dispute is answered in Stripe with the evidence stored for the gift and the reading.

## Pre-requisites

- `wrangler` signed in with access to the production D1 `withjosephine_bookings`.
- The Stripe dashboard in live mode.
- The Checkout Session id (`cs_...`) of the disputed payment. Its `client_reference_id` is `gift_<gift id>`.

## Find the gift

```sh
wrangler d1 execute withjosephine_bookings --remote \
  --command "SELECT id, status, redeemed_submission_id FROM gift_codes WHERE stripe_session_id = '<cs_ id>'"
```

`status` is `active` before the gift is opened and `redeemed` after it.

## Before the gift is opened

Cancel the gift:

```sh
wrangler d1 execute withjosephine_bookings --remote \
  --command "UPDATE gift_codes SET status = 'cancelled', updated_at = '<now ISO>' WHERE id = '<gift id>' AND status = 'active'"
```

The result reports one changed row. No changed row means the gift was opened in the meantime: go to "After the gift is opened".

### Pass criteria

- `SELECT status FROM gift_codes WHERE id = '<gift id>'` returns `cancelled`.
- `/gift/<code>` shows "This gift is no longer active".
- The buyer's send link shows "This link doesn’t work any more".
- After the next `reconcile-mirror` run (every 6 hours), the Gifts list in Studio shows "Cancelled".

## After the gift is opened

`redeemed_submission_id` from "Find the gift" names the recipient's submission.

Collect the evidence:

```sh
wrangler d1 execute withjosephine_bookings --remote \
  --command "SELECT cooling_off_acknowledged_at, consent_label, activated_at FROM gift_codes WHERE id = '<gift id>'"
wrangler d1 execute withjosephine_bookings --remote \
  --command "SELECT delivered_at, voice_note_url, pdf_url FROM submissions WHERE id = '<redeemed_submission_id>'"
```

Answer the dispute in the Stripe dashboard with the payment, the cooling-off acknowledgement time and consent label from the gift row, the delivery time, and the delivered voice note and PDF.

### Pass criteria

- The dispute in Stripe shows the evidence as submitted.
