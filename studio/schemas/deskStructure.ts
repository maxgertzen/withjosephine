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

export const deskStructure = (S: StructureBuilder) =>
  S.list()
    .title("Content")
    .items([
      singletonListItem(S, "siteSettings", "Site Settings"),
      singletonListItem(S, "theme", "Theme"),
      S.divider(),
      singletonListItem(S, "landingPage", "Landing Page"),
      singletonListItem(S, "bookingPage", "Booking Page"),
      singletonListItem(S, "thankYouPage", "Thank You Page"),
      singletonListItem(S, "underConstructionPage", "Under Construction Page"),
      singletonListItem(S, "notFoundPage", "404 Page"),
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
              singletonListItem(S, "bookingForm", "Booking Form"),
              S.divider(),
              submissionsByStatus(S, "Pending Submissions", "submissionsPending", "pending"),
              submissionsByStatus(S, "Paid Submissions", "submissionsPaid", "paid"),
              submissionsByStatus(S, "Expired Submissions", "submissionsExpired", "expired"),
              S.divider(),
              S.documentTypeListItem("formField").title("Form Fields"),
              S.documentTypeListItem("formSection").title("Form Sections"),
            ]),
        ),
    ]);
