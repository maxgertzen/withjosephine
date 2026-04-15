import type { StructureBuilder } from "sanity/structure";

export const SINGLETON_TYPES = new Set([
  "landingPage",
  "bookingPage",
  "thankYouPage",
  "siteSettings",
  "theme",
]);

const singletonListItem = (S: StructureBuilder, typeName: string, title: string) =>
  S.listItem()
    .title(title)
    .id(typeName)
    .child(S.document().schemaType(typeName).documentId(typeName));

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
      S.divider(),
      S.documentTypeListItem("reading").title("Readings"),
      S.documentTypeListItem("testimonial").title("Testimonials"),
      S.documentTypeListItem("faqItem").title("FAQ Items"),
      S.divider(),
      S.documentTypeListItem("legalPage").title("Legal Pages"),
    ]);
