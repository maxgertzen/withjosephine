import { EnvelopeIcon } from "@sanity/icons";
import { defineDocuments, defineLocations, type PresentationPluginOptions } from "sanity/presentation";

import { GIFT_PREVIEW_LINKS } from "@/lib/page-previews/preview-fixtures-pages";

/**
 * `origin` is the preview host (set via SANITY_STUDIO_PREVIEW_URL); the
 * website is responsible for reading `draftMode()` and switching to the
 * `previewDrafts` perspective when that mode is active.
 *
 * Email singletons surface in Presentation's "Used on" panel via showHref:false
 * locations; they aren't real URL targets, just navigation affordances.
 */
const emailLocation = (title: string) =>
  defineLocations({
    locations: [{ title, href: "#", showHref: false, icon: EnvelopeIcon }],
  });

const BOOKING_PAGES = defineLocations({
  message: "Affects every booking page (/book/*).",
  locations: [{ title: "Booking", href: "/preview/book/soul-blueprint" }],
});

export const presentationResolve: PresentationPluginOptions["resolve"] = {
  // Literal two-segment routes MUST precede the /preview/:slug wildcard (it also matches two segments).
  mainDocuments: defineDocuments([
    { route: "/preview", type: "landingPage" },
    {
      route: "/preview/book/:slug",
      filter: `_type == "reading" && slug.current == $slug`,
      params: ({ params }) => ({ slug: params.slug }),
    },
    { route: "/preview/thank-you/:slug", type: "thankYouPage" },
    { route: "/preview/gift/:state", type: "giftSettings" },
    {
      route: "/preview/notes/:slug",
      filter: `_type == "article" && slug.current == $slug`,
      params: ({ params }) => ({ slug: params.slug }),
    },
    { route: "/preview/notes", type: "notesSettings" },
    { route: "/preview/under-construction", type: "underConstructionPage" },
    { route: "/preview/404", type: "notFoundPage" },
    {
      route: "/preview/:slug",
      filter: `_type == "legalPage" && slug.current == $slug`,
      params: ({ params }) => ({ slug: params.slug }),
    },
  ]),
  locations: {
    landingPage: defineLocations({
      message: "This document impacts the landing page.",
      locations: [{ title: "Landing Page", href: "/preview" }],
    }),
    reading: defineLocations({
      select: { name: "name", slug: "slug.current" },
      resolve: (doc) => ({
        locations: doc?.slug
          ? [
              { title: String(doc.name ?? "Reading"), href: `/preview/book/${doc.slug}` },
              { title: "Thank You", href: `/preview/thank-you/${doc.slug}` },
            ]
          : [],
      }),
    }),
    bookingPage: BOOKING_PAGES,
    bookingForm: BOOKING_PAGES,
    thankYouPage: defineLocations({
      message: "Affects all thank-you pages (/thank-you/*).",
      locations: [{ title: "Thank You", href: "/preview/thank-you/soul-blueprint" }],
    }),
    legalPage: defineLocations({
      select: { title: "title", slug: "slug.current" },
      resolve: (doc) => ({
        locations: doc?.slug
          ? [{ title: String(doc.title ?? "Legal Page"), href: `/preview/${doc.slug}` }]
          : [],
      }),
    }),
    siteSettings: defineLocations({
      message: "Global site settings: affects every page.",
      locations: [{ title: "Landing Page", href: "/preview" }],
    }),
    theme: defineLocations({
      message: "Global theme tokens: affects every page.",
      locations: [{ title: "Landing Page", href: "/preview" }],
    }),
    testimonial: defineLocations({
      message: "Shown in the testimonials section on the landing page.",
      locations: [{ title: "Landing Page", href: "/preview" }],
    }),
    faqItem: defineLocations({
      message: "Shown in the FAQ section on the landing page.",
      locations: [{ title: "Landing Page", href: "/preview" }],
    }),
    article: defineLocations({
      select: { title: "title", slug: "slug.current" },
      resolve: (doc) => ({
        locations: doc?.slug
          ? [
              { title: String(doc.title ?? "Note"), href: `/preview/notes/${doc.slug}` },
              { title: "Notes", href: "/preview/notes" },
            ]
          : [],
      }),
    }),
    notesSettings: defineLocations({
      message: "Affects /notes and every note.",
      locations: [{ title: "Notes", href: "/preview/notes" }],
    }),
    giftSettings: defineLocations({
      message: "Affects the gift sheet and the gift pages.",
      locations: GIFT_PREVIEW_LINKS,
    }),
    underConstructionPage: defineLocations({
      message: "Shown when the site is in under-construction mode.",
      locations: [{ title: "Under Construction", href: "/preview/under-construction" }],
    }),
    notFoundPage: defineLocations({
      message: "Shown for unknown routes (404).",
      locations: [{ title: "404 Page", href: "/preview/404" }],
    }),
    emailOrderConfirmation: emailLocation("Email: Order Confirmation"),
    emailGiftPurchase: emailLocation("Email: Gift Buyer Confirmation"),
    emailGiftOpened: emailLocation("Email: Gift Opened (Buyer)"),
    emailGiftRecipientConfirmation: emailLocation("Email: Gift Confirmation (Recipient)"),
    emailReadingDelivery: emailLocation("Email: Reading Delivery Email"),
    emailMagicLink: emailLocation("Email: Magic Link (Listen Page)"),
    emailPrivacyExport: emailLocation("Email: Privacy Export (GDPR)"),
    emailSharedShell: emailLocation("Email: Shared Shell (brand + footer)"),
  },
};
