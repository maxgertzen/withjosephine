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
  "myReadingsPage",
  "magicLinkVerifyPage",
  "emailMagicLink",
  "emailDay7Delivery",
  "listenPage",
]);

const singletonListItem = (S: StructureBuilder, typeName: string, title: string) =>
  S.listItem()
    .title(title)
    .id(typeName)
    .child(S.document().schemaType(typeName).documentId(typeName));

const submissionsByStatus = (
  S: StructureBuilder,
  title: string,
  id: string,
  status: "pending" | "paid" | "expired",
) =>
  S.listItem()
    .title(title)
    .id(id)
    .child(
      S.documentList()
        .title(title)
        .schemaType("submission")
        .filter('_type == "submission" && status == $status')
        .params({ status })
        .defaultOrdering([{ field: "createdAt", direction: "desc" }]),
    );

const PENDING_OVER_24H_FILTER =
  '_type == "submission" && status == "pending" && dateTime(createdAt) < dateTime(now()) - 60*60*24';

const submissionsPendingOver24h = (S: StructureBuilder) =>
  S.listItem()
    .title("Pending > 24h")
    .id("submissionsPendingOver24h")
    .child(
      S.documentList()
        .title("Pending > 24h")
        .schemaType("submission")
        .filter(PENDING_OVER_24H_FILTER)
        .defaultOrdering([{ field: "createdAt", direction: "asc" }]),
    );

const submissionsPaidAwaitingDelivery = (S: StructureBuilder) =>
  S.listItem()
    .title("Paid awaiting delivery")
    .id("submissionsPaidAwaitingDelivery")
    .child(
      S.documentList()
        .title("Paid awaiting delivery")
        .schemaType("submission")
        .filter('_type == "submission" && status == "paid" && !defined(deliveredAt)')
        .defaultOrdering([{ field: "paidAt", direction: "asc" }]),
    );

const submissionsDelivered = (S: StructureBuilder) =>
  S.listItem()
    .title("Delivered")
    .id("submissionsDelivered")
    .child(
      S.documentList()
        .title("Delivered")
        .schemaType("submission")
        .filter('_type == "submission" && defined(deliveredAt)')
        .defaultOrdering([{ field: "deliveredAt", direction: "desc" }]),
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
        .title("✉️  Customer copy")
        .id("customerCopyGroup")
        .child(
          S.list()
            .title("Customer copy")
            .items([
              singletonListItem(S, "listenPage", "Listen Page"),
              singletonListItem(S, "myReadingsPage", "My Readings Page"),
              singletonListItem(S, "magicLinkVerifyPage", "Magic Link — Confirm Email Page"),
              singletonListItem(S, "emailMagicLink", "Email — Magic Link"),
              singletonListItem(S, "emailDay7Delivery", "Email — Day-7 Delivery"),
            ]),
        ),
      S.divider(),
      S.documentTypeListItem("reading").title("Readings"),
      S.documentTypeListItem("testimonial").title("Testimonials"),
      S.documentTypeListItem("faqItem").title("FAQ Items"),
      S.divider(),
      S.documentTypeListItem("legalPage").title("Legal Pages"),
      S.divider(),
      S.listItem()
        .title("📋 Bookings")
        .id("bookingsGroup")
        .child(
          S.list()
            .title("Bookings")
            .items([
              singletonListItem(S, "bookingPage", "Booking Page"),
              singletonListItem(S, "bookingForm", "Booking Form"),
              singletonListItem(S, "thankYouPage", "Thank You Page"),
              S.divider(),
              submissionsByStatus(S, "Pending Submissions", "submissionsPending", "pending"),
              submissionsByStatus(S, "Paid Submissions", "submissionsPaid", "paid"),
              submissionsByStatus(S, "Expired Submissions", "submissionsExpired", "expired"),
              S.divider(),
              submissionsPendingOver24h(S),
              submissionsPaidAwaitingDelivery(S),
              submissionsDelivered(S),
              S.divider(),
              S.documentTypeListItem("formField").title("Form Fields"),
              S.documentTypeListItem("formSection").title("Form Sections"),
            ]),
        ),
    ]);
