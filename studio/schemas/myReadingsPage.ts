import { defineField, defineType } from "sanity";

export const myReadingsPage = defineType({
  name: "myReadingsPage",
  title: "My Readings Page",
  type: "document",
  fields: [
    defineField({
      name: "listHeading",
      title: "List — Heading",
      type: "string",
      description: "Page heading shown to a signed-in customer browsing their readings.",
      initialValue: "Your readings",
    }),
    defineField({
      name: "listSubheading",
      title: "List — Subheading",
      type: "text",
      rows: 2,
      initialValue: "Gathered here, ready when you are.",
    }),
    defineField({
      name: "openButtonLabel",
      title: "Open-reading button label",
      type: "string",
      initialValue: "Open your reading",
    }),
    defineField({
      name: "emptyHeading",
      title: "Empty state — body",
      type: "text",
      rows: 2,
      description: "Shown when a signed-in customer has no readings yet.",
      initialValue: "Your readings will appear here once they're delivered.",
    }),
    defineField({
      name: "emptyCtaLabel",
      title: "Empty state — CTA label",
      type: "string",
      initialValue: "Explore Readings",
    }),
    defineField({
      name: "expiredRowLabel",
      title: "Expired row — short label",
      type: "string",
      description:
        "Shown in place of the delivery date for readings older than 90 days.",
      initialValue: "Rested past 90 days",
    }),
    defineField({
      name: "expiredMailtoLabel",
      title: "Expired row — mailto label",
      type: "string",
      initialValue: "Email for a fresh link",
    }),
    defineField({
      name: "expiredMailtoSubject",
      title: "Expired row — mailto subject",
      type: "string",
      initialValue: "I need a fresh link to my reading",
    }),
    defineField({
      name: "signInHeading",
      title: "Sign-in card — heading",
      type: "string",
      initialValue: "Welcome back",
    }),
    defineField({
      name: "signInBody",
      title: "Sign-in card — body",
      type: "text",
      rows: 2,
      initialValue:
        "Tell us the email you used to book, and we'll send a fresh link to open your reading.",
    }),
    defineField({
      name: "signInButtonLabel",
      title: "Sign-in card — button label",
      type: "string",
      initialValue: "Send me a link",
    }),
    defineField({
      name: "signInFootnote",
      title: "Sign-in card — italic footnote",
      type: "string",
      initialValue: "Your reading is still here, exactly as it was.",
    }),
    defineField({
      name: "checkEmailHeading",
      title: "Check-your-email card — heading",
      type: "string",
      initialValue: "Check your email",
    }),
    defineField({
      name: "checkEmailBody",
      title: "Check-your-email card — body",
      type: "text",
      rows: 2,
      initialValue:
        "If we have a reading on file for that email, a fresh link is on its way. It expires in twenty-four hours.",
    }),
    defineField({
      name: "checkEmailResendLabel",
      title: "Check-your-email card — resend link label",
      type: "string",
      initialValue: "Send another",
    }),
    defineField({
      name: "readingsTabLabel",
      title: "Tabs (readings tab label)",
      type: "string",
      description:
        "Label for the readings tab in the unified library. Counts appear next to this label.",
      initialValue: "Readings",
    }),
    defineField({
      name: "giftsTabLabel",
      title: "Tabs (gifts tab label)",
      type: "string",
      description:
        "Label for the gifts tab in the unified library. Counts appear next to this label.",
      initialValue: "Gifts",
    }),
    defineField({
      name: "welcomeHeading",
      title: "Welcome interstitial (heading)",
      type: "string",
      description:
        "Shown on /my-readings/welcome when a customer taps the library link in a purchaser email. Leave blank to use the hardcoded fallback.",
      initialValue: "Welcome to your library.",
    }),
    defineField({
      name: "welcomeSubhead",
      title: "Welcome interstitial (subhead)",
      type: "text",
      rows: 3,
      description:
        "Body copy on the welcome interstitial. Leave blank to use the hardcoded fallback.",
      initialValue:
        "Tap the button below to sign in and see every reading gathered in one place. This link is private to you, please do not forward.",
    }),
    defineField({
      name: "welcomeButtonLabel",
      title: "Welcome interstitial (button label)",
      type: "string",
      description:
        "Continue button label on the welcome interstitial. Leave blank to use the hardcoded fallback.",
      initialValue: "Continue to your library",
    }),
  ],
  preview: {
    prepare: () => ({ title: "My Readings Page" }),
  },
});
