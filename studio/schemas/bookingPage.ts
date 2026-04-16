import { defineField, defineType } from "sanity";

export const bookingPage = defineType({
  name: "bookingPage",
  title: "Booking Page",
  type: "document",
  fields: [
    defineField({
      name: "emailLabel",
      title: "Email Label",
      type: "string",
      initialValue: "Your Email Address",
    }),
    defineField({
      name: "emailDisclaimer",
      title: "Email Disclaimer",
      type: "string",
      initialValue: "Your email is only used for this reading. I'll never share it.",
    }),
    defineField({
      name: "paymentButtonText",
      title: "Payment Button Text",
      type: "string",
      initialValue: "Continue to Payment",
    }),
    defineField({
      name: "securityNote",
      title: "Security Note",
      type: "string",
      initialValue: "Secure checkout · Your details are safe",
    }),
    defineField({
      name: "entertainmentAcknowledgment",
      title: "Entertainment-Purposes Checkbox Label",
      type: "text",
      rows: 4,
      description:
        'US-compliance checkbox shown at checkout. Keep the phrase "for entertainment purposes only" verbatim — it is the recognised safe-harbour wording across NY, PA, MD, NV, TX, Santa Monica and Chicago fortune-telling / psychic-services statutes. Changing that phrase weakens chargeback defence and FTC §5 posture.',
      initialValue:
        "I understand that this reading is provided for entertainment purposes only. It is not a substitute for medical, psychological, legal, or financial advice. I will not rely on it as a factual prediction or guarantee of future outcomes.",
      validation: (rule) =>
        rule
          .required()
          .min(80)
          .error(
            'Entertainment-purposes checkbox copy is required and must include the safe-harbour phrase "for entertainment purposes only".',
          ),
    }),
    defineField({
      name: "coolingOffAcknowledgment",
      title: "Cooling-Off Waiver Checkbox Label",
      type: "text",
      rows: 3,
      description:
        "EU/UK Consumer Contracts Regulations 2013 cooling-off waiver. Must communicate that the customer consents to immediate performance and waives their 14-day cancellation right.",
      initialValue:
        "I agree that Josephine may begin preparing my reading immediately, and I understand I will lose my right to cancel for a refund once I submit the intake form.",
      validation: (rule) =>
        rule
          .required()
          .min(50)
          .error("Cooling-off waiver checkbox copy is required."),
    }),
    defineField({
      name: "formatNote",
      title: "Format Note",
      type: "string",
      description: "Short description of what the customer receives (shown next to the mic icon).",
      initialValue: "Detailed voice note recording + a supporting PDF created entirely for you.",
    }),
    defineField({
      name: "closingMessage",
      title: "Closing Message",
      type: "text",
      rows: 2,
      initialValue: "I can't wait to connect with you through your reading.\nWith love, Josephine ✦",
    }),
    defineField({
      name: "deliveryNote",
      title: "Delivery Note",
      type: "string",
      initialValue: "You'll receive your voice note and PDF within 7 days of payment.",
    }),
    defineField({
      name: "seo",
      title: "SEO",
      type: "object",
      fields: [
        defineField({ name: "metaTitle", title: "Meta Title", type: "string" }),
        defineField({ name: "metaDescription", title: "Meta Description", type: "text", rows: 2 }),
        defineField({ name: "ogImage", title: "OG Image", type: "image" }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: "Booking Page" }),
  },
});
