-- Capture the actual paid amount (after Stripe coupon / promo code) on
-- checkout.session.completed events. amount_total is in the smallest
-- currency unit (cents for USD); currency is the lowercase ISO code Stripe
-- returns ("usd"). Both nullable — older paid rows pre-dating this column
-- continue to render the list price.
ALTER TABLE submissions ADD COLUMN amount_paid_cents INTEGER;
ALTER TABLE submissions ADD COLUMN amount_paid_currency TEXT;
