# Duplicate Payment

A buyer pays twice for one gift or one booking, in two Checkout Sessions. The webhook and the reconcile cron refund the second session automatically, but only after Stripe shows that the kept session's payment succeeded and has no refund and no dispute. This runbook is for the cases where the app did not refund.

## When to use it

- Sentry shows an exception from `[duplicatePayment] refund failed`, or a warning "Duplicate Checkout session has no payment intent, no refund".
- Sentry shows an error "Duplicate Checkout payment not refunded, the kept payment is ...". See "Kept payment not safe" below.
- `listen_audit` has a `duplicate_payment_refunded` row with `success = 0`.
- Sentry shows a warning "Paid Checkout session for a gift cancelled before payment". The app never refunds this case. Refund the Sentry `stripeSessionId` by hand with "Refund the second session" below.
- Sentry shows an error "Paid Checkout session for a submission paid without a Stripe session". The booking was paid by a gift, then paid again in Stripe. The app never refunds this case. Refund the Sentry `stripeSessionId` by hand with "Refund the second session" below, skipping steps 1 and 2.

A Sentry warning "Duplicate Checkout payment refunded" means the refund succeeded. Nothing to do.

A Sentry warning "Duplicate Checkout payment was already refunded in Stripe" means the second payment was refunded before the app tried, by hand or by an earlier try. Nothing to do.

A Sentry warning "Duplicate Checkout payment refund is pending, confirm it in Stripe the next day" means Stripe accepted the refund but has not finished it. The next day, search Stripe for the Sentry `stripeSessionId` and check that its payment shows "Refunded". If it does not, follow "Refund the second session" below.

A Sentry exception from `[duplicatePayment] refund made ... but its audit write failed` means the refund was made. Check its payment in Stripe as for a pending refund.

## Pre-requisites

- `wrangler` signed in with access to the production D1 `withjosephine_bookings`.
- The Stripe dashboard in live mode.
- From the Sentry event extras: `clientReferenceId`, `stripeSessionId` (the `cs_...` id of the second session) and, when present, `keptSessionId`.

## Find the kept session

A `clientReferenceId` that starts with `gift_` is a gift. The gift id is the part after `gift_`.

Gift:

```sh
wrangler d1 execute withjosephine_bookings --remote \
  --command "SELECT id, status, stripe_session_id FROM gift_codes WHERE id = '<gift id>'"
```

Booking:

```sh
wrangler d1 execute withjosephine_bookings --remote \
  --command "SELECT id, status, stripe_session_id FROM submissions WHERE id = '<clientReferenceId>'"
```

`stripe_session_id` is the kept session.

## Kept payment not safe

The Sentry error names the reason:

| Reason | Meaning |
|---|---|
| refunded | The kept payment has a full or partial refund. |
| disputed | The kept payment has a dispute. |
| without a succeeded charge | The kept payment has no succeeded charge. |
| not paid | The kept session is not paid. |
| for another reference | The kept session belongs to another gift or booking. |
| not on record | D1 holds no other paid session for this gift or booking. |

Open the kept session and the second session in Stripe. Refund the second session only when the kept session's payment shows "Succeeded" with no refund and no dispute. Otherwise the second payment is the one the customer paid for. Do not refund it.

## Refund the second session

1. Check that `stripe_session_id` from "Find the kept session" differs from the Sentry `stripeSessionId`. When the two are equal, do not refund and report the event.
2. In the Stripe dashboard, search for `stripe_session_id` and check that its payment shows "Succeeded" with no refund and no dispute.
3. Search for the Sentry `stripeSessionId` and open its payment.
4. Click Refund, choose the full amount and the reason "Duplicate".

Sentry reports a failure once per session. Reconcile runs every 6 hours and looks back 24 hours, so it tries the refund again about 4 times. Each try uses a new Stripe idempotency key per hour. After a refund by hand, the next try gets "charge already refunded" from Stripe, records it in `listen_audit` and stops.

## Pass criteria

- The payment of the Sentry `stripeSessionId` shows "Refunded" in Stripe.
- The payment of the kept session shows "Succeeded".
- The gift or booking row still holds the kept `stripe_session_id`.
