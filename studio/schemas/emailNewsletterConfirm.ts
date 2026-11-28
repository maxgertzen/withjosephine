import { EMAIL_NEWSLETTER_CONFIRM_DEFAULTS } from "../../src/data/defaults";
import { oneButtonEmailSchema } from "./_shared/oneButtonEmail";

export const emailNewsletterConfirm = oneButtonEmailSchema({
  name: "emailNewsletterConfirm",
  title: "Newsletter: Confirm Your Email → New Subscriber",
  whenSent:
    "Sent when someone ticks the newsletter box. They join the newsletter only after they tap the button in this email. The link works for 7 days.",
  defaults: EMAIL_NEWSLETTER_CONFIRM_DEFAULTS,
});
