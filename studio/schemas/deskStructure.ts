import type { StructureBuilder } from "sanity/structure";

export const SINGLETON_TYPES = new Set([
  "landingPage",
  "bookingPage",
  "thankYouPage",
  "siteSettings",
  "theme",
  "underConstructionPage",
  "notFoundPage",
  "bookingForm",
  "bookingGiftForm",
  "myReadingsPage",
  "magicLinkVerifyPage",
  "emailMagicLink",
  "emailDay7Delivery",
  "emailDay2Started",
  "emailOrderConfirmation",
  "emailGiftPurchaseConfirmation",
  "listenPage",
]);

const singletonListItem = (S: StructureBuilder, typeName: string, title: string) =>
  S.listItem()
    .title(title)
    .id(typeName)
    .child(S.document().schemaType(typeName).documentId(typeName));

const awaitingPayment = (S: StructureBuilder) =>
  S.listItem()
    .title("🟡 Awaiting payment")
    .id("submissionsAwaitingPayment")
    .child(
      S.documentList()
        .title("Awaiting payment")
        .schemaType("submission")
        .filter('_type == "submission" && status == "pending"')
        .defaultOrdering([{ field: "createdAt", direction: "desc" }]),
    );

const paidAwaitingDelivery = (S: StructureBuilder) =>
  S.listItem()
    .title("🟠 Paid awaiting delivery")
    .id("submissionsPaidAwaitingDelivery")
    .child(
      S.documentList()
        .title("Paid awaiting delivery")
        .schemaType("submission")
        .filter('_type == "submission" && status == "paid" && !defined(deliveredAt)')
        .defaultOrdering([{ field: "paidAt", direction: "asc" }]),
    );

const deliveredListened = (S: StructureBuilder) =>
  S.listItem()
    .title("✓ Listened")
    .id("submissionsDeliveredListened")
    .child(
      S.documentList()
        .title("Listened")
        .schemaType("submission")
        .filter('_type == "submission" && defined(deliveredAt) && defined(listenedAt)')
        .defaultOrdering([{ field: "listenedAt", direction: "desc" }]),
    );

const deliveredNotListened = (S: StructureBuilder) =>
  S.listItem()
    .title("○ Not listened")
    .id("submissionsDeliveredNotListened")
    .child(
      S.documentList()
        .title("Not listened")
        .schemaType("submission")
        .filter('_type == "submission" && defined(deliveredAt) && !defined(listenedAt)')
        .defaultOrdering([{ field: "deliveredAt", direction: "desc" }]),
    );

const deliveredGroup = (S: StructureBuilder) =>
  S.listItem()
    .title("🟢 Delivered")
    .id("submissionsDelivered")
    .child(
      S.list()
        .title("Delivered")
        .items([deliveredListened(S), deliveredNotListened(S)]),
    );

const submissionsRoot = (S: StructureBuilder) =>
  S.listItem()
    .title("📬 Submissions")
    .id("submissionsRoot")
    .child(
      S.list()
        .title("Submissions")
        .items([awaitingPayment(S), paidAwaitingDelivery(S), deliveredGroup(S)]),
    );

export const deskStructure = (S: StructureBuilder) =>
  S.list()
    .title("Content")
    .items([
      singletonListItem(S, "siteSettings", "Site Settings"),
      singletonListItem(S, "theme", "Theme"),
      S.divider(),
      singletonListItem(S, "landingPage", "Landing Page"),
      singletonListItem(S, "underConstructionPage", "Under Construction Page"),
      singletonListItem(S, "notFoundPage", "404 Page"),
      S.divider(),
      S.listItem()
        .title("✉️  Customer emails & pages")
        .id("customerEmailsAndPagesGroup")
        .child(
          S.list()
            .title("Customer emails & pages")
            .items([
              singletonListItem(S, "listenPage", "Listen Page"),
              singletonListItem(S, "myReadingsPage", "My Readings Page"),
              singletonListItem(S, "magicLinkVerifyPage", "Magic Link — Confirm Email Page"),
              singletonListItem(S, "emailOrderConfirmation", "Email — Order Confirmation"),
              singletonListItem(
                S,
                "emailGiftPurchaseConfirmation",
                "Email — Gift Purchase Confirmation",
              ),
              singletonListItem(S, "emailDay2Started", "Email — Day 2 (I've Started)"),
              singletonListItem(S, "emailDay7Delivery", "Email — Day-7 Delivery"),
              singletonListItem(S, "emailMagicLink", "Email — Magic Link"),
            ]),
        ),
      S.divider(),
      S.documentTypeListItem("reading").title("Readings"),
      S.documentTypeListItem("testimonial").title("Testimonials"),
      S.documentTypeListItem("faqItem").title("FAQ Items"),
      S.divider(),
      S.documentTypeListItem("legalPage").title("Legal Pages"),
      S.divider(),
      submissionsRoot(S),
      S.divider(),
      S.listItem()
        .title("📋 Booking Configuration")
        .id("bookingConfigurationGroup")
        .child(
          S.list()
            .title("Booking Configuration")
            .items([
              singletonListItem(S, "bookingPage", "Booking Page"),
              singletonListItem(S, "bookingForm", "Booking Form"),
              singletonListItem(S, "bookingGiftForm", "Booking Gift Form"),
              singletonListItem(S, "thankYouPage", "Thank You Page"),
              S.documentTypeListItem("formField").title("Form Fields"),
              S.documentTypeListItem("formSection").title("Form Sections"),
            ]),
        ),
    ]);
