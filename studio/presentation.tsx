import { EnvelopeIcon } from "@sanity/icons";
import { defineLocations, type PresentationPluginOptions } from "sanity/presentation";

/**
 * `origin` is the preview host (set via SANITY_STUDIO_PREVIEW_URL); the
 * website is responsible for reading `draftMode()` and switching to the
 * `previewDrafts` perspective when that mode is active.
 *
 * Email singletons surface in Presentation's "Used on" panel via showHref:false
 * locations — they aren't real URL targets, just navigation affordances.
 */
const emailLocation = (title: string) =>
  defineLocations({
    locations: [{ title, href: "#", showHref: false, icon: EnvelopeIcon }],
  });

export const presentationResolve: PresentationPluginOptions["resolve"] = {
  locations: {
    landingPage: defineLocations({
      message: "This document impacts the landing page.",
      locations: [{ title: "Landing Page", href: "/" }],
    }),
    reading: defineLocations({
      select: { name: "name", slug: "slug.current" },
      resolve: (doc) => ({
        locations: doc?.slug
          ? [
              { title: String(doc.name ?? "Reading"), href: `/book/${doc.slug}` },
              { title: "Thank You", href: `/thank-you/${doc.slug}` },
            ]
          : [],
      }),
    }),
    bookingPage: defineLocations({
      message: "Affects all booking pages (/book/*).",
      locations: [{ title: "Booking", href: "/book/soul-blueprint" }],
    }),
    thankYouPage: defineLocations({
      message: "Affects all thank-you pages (/thank-you/*).",
      locations: [{ title: "Thank You", href: "/thank-you/soul-blueprint" }],
    }),
    legalPage: defineLocations({
      select: { title: "title", slug: "slug.current" },
      resolve: (doc) => ({
        locations: doc?.slug
          ? [{ title: String(doc.title ?? "Legal Page"), href: `/${doc.slug}` }]
          : [],
      }),
    }),
    siteSettings: defineLocations({
      message: "Global site settings — affects every page.",
      locations: [{ title: "Landing Page", href: "/" }],
    }),
    theme: defineLocations({
      message: "Global theme tokens — affects every page.",
      locations: [{ title: "Landing Page", href: "/" }],
    }),
    testimonial: defineLocations({
      message: "Shown in the testimonials section on the landing page.",
      locations: [{ title: "Landing Page", href: "/" }],
    }),
    faqItem: defineLocations({
      message: "Shown in the FAQ section on the landing page.",
      locations: [{ title: "Landing Page", href: "/" }],
    }),
    underConstructionPage: defineLocations({
      message: "Shown when the site is in under-construction mode.",
      locations: [{ title: "Landing Page", href: "/" }],
    }),
    notFoundPage: defineLocations({
      message: "Shown for unknown routes (404).",
      locations: [{ title: "404 Page", href: "/this-page-does-not-exist" }],
    }),
    emailOrderConfirmation: emailLocation("Email: Order Confirmation"),
    emailDay7Delivery: emailLocation("Email: Reading Delivery (Day 7)"),
    emailGiftClaim: emailLocation("Email: Gift Claim (First Send)"),
    emailGiftClaimReminder: emailLocation("Email: Gift Claim (Reminder)"),
    emailGiftPurchaseConfirmationScheduled: emailLocation(
      "Email: Gift Confirmation (Scheduled)",
    ),
    emailGiftPurchaseConfirmationSelfSend: emailLocation(
      "Email: Gift Confirmation (Self-Send)",
    ),
    emailMagicLink: emailLocation("Email: Magic Link (Listen Page)"),
    emailMagicLinkLibrary: emailLocation("Email: Magic Link (Library)"),
    emailNewDeviceNotice: emailLocation("Email: New Device Notice"),
    emailPrivacyExport: emailLocation("Email: Privacy Export (GDPR)"),
    emailRecipientIntakeReceived: emailLocation("Email: Intake Received (Recipient)"),
    emailSharedShell: emailLocation("Email: Shared Shell (brand + footer)"),
    emailStepUpOtp: emailLocation("Email: Step-up Code"),
  },
};
