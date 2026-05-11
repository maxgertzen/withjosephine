import { defineField, defineType } from "sanity";

export const myReadingsPage = defineType({
  name: "myReadingsPage",
  title: "My Readings Page",
  type: "document",
  fields: [
    defineField({
      name: "title",
      type: "string",
      hidden: true,
      initialValue: "My Readings Page",
    }),
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
  ],
  preview: {
    prepare: () => ({ title: "My Readings Page" }),
  },
});
