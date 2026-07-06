import type { ComponentType } from "react";
import type { StructureBuilder } from "sanity/structure";

import { EMAIL_ALLOWED_SLOTS } from "../../src/lib/emails/slots";
import { EmailPreview } from "../views/EmailPreview";
import {
  ListenPagePreview,
  MagicLinkVerifyPagePreview,
  ThankYouPagePreview,
} from "../views/StudioPagePreview";

// Email singletons that support the send-to-test doc action.
// Derived from EmailTemplateKey via EMAIL_ALLOWED_SLOTS keys so adding a
// new template (and its slot allowlist) auto-enrolls it in the action.
// emailSharedShell is intentionally not in EmailTemplateKey: it's brand
// config, not a standalone email.
export const EMAIL_PREVIEW_SINGLETON_TYPES: ReadonlySet<string> = new Set(
  Object.keys(EMAIL_ALLOWED_SLOTS),
);

export const SINGLETON_TYPES = new Set([
  "landingPage",
  "bookingPage",
  "thankYouPage",
  "siteSettings",
  "theme",
  "underConstructionPage",
  "notFoundPage",
  "bookingForm",
  "magicLinkVerifyPage",
  "emailMagicLink",
  "emailDay7Delivery",
  "emailOrderConfirmation",
  "emailPrivacyExport",
  "emailSharedShell",
  "listenPage",
]);

const singletonListItem = (S: StructureBuilder, typeName: string, title: string) =>
  S.listItem()
    .title(title)
    .id(typeName)
    .child(S.document().schemaType(typeName).documentId(typeName));

const emailSingletonListItem = (S: StructureBuilder, typeName: string, title: string) =>
  S.listItem()
    .title(title)
    .id(typeName)
    .child(
      S.document()
        .schemaType(typeName)
        .documentId(typeName)
        .views([S.view.form(), S.view.component(EmailPreview).title("Preview")]),
    );

const pagePreviewSingletonListItem = (
  S: StructureBuilder,
  typeName: string,
  title: string,
  PreviewComponent: ComponentType,
) =>
  S.listItem()
    .title(title)
    .id(typeName)
    .child(
      S.document()
        .schemaType(typeName)
        .documentId(typeName)
        .views([S.view.form(), S.view.component(PreviewComponent).title("Preview")]),
    );

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

const bookingFlowGroup = (S: StructureBuilder) =>
  S.listItem()
    .title("📋 Booking Flow")
    .id("bookingFlowGroup")
    .child(
      S.list()
        .title("Booking Flow")
        .items([
          singletonListItem(S, "bookingPage", "Booking Page"),
          pagePreviewSingletonListItem(S, "thankYouPage", "Thank You Page", ThankYouPagePreview),
          singletonListItem(S, "bookingForm", "Booking Form"),
        ]),
    );

const pagesGroup = (S: StructureBuilder) =>
  S.listItem()
    .title("📄 Pages")
    .id("pagesGroup")
    .child(
      S.list()
        .title("Pages")
        .items([
          singletonListItem(S, "landingPage", "Landing Page"),
          singletonListItem(S, "underConstructionPage", "Under Construction Page"),
          singletonListItem(S, "notFoundPage", "404 Page"),
          S.divider(),
          pagePreviewSingletonListItem(S, "listenPage", "Listen Page", ListenPagePreview),
          pagePreviewSingletonListItem(
            S,
            "magicLinkVerifyPage",
            "Magic Link: Confirm Email Page",
            MagicLinkVerifyPagePreview,
          ),
          S.divider(),
          bookingFlowGroup(S),
        ]),
    );

const emailsGroup = (S: StructureBuilder) =>
  S.listItem()
    .title("✉️ Emails")
    .id("emailsGroup")
    .child(
      S.list()
        .title("Emails")
        .items([
          emailSingletonListItem(S, "emailOrderConfirmation", "Order Confirmation → Self-Purchaser"),
          emailSingletonListItem(S, "emailDay7Delivery", "Reading Delivery → Customer"),
          emailSingletonListItem(S, "emailMagicLink", "Magic Link → Listen Page"),
          emailSingletonListItem(S, "emailPrivacyExport", "Privacy Export → Requester (GDPR)"),
          S.divider(),
          singletonListItem(S, "emailSharedShell", "Shared Shell (brand + footer)"),
        ]),
    );

const formBuildingBlocksGroup = (S: StructureBuilder) =>
  S.listItem()
    .title("🧩 Form Building Blocks")
    .id("formBuildingBlocksGroup")
    .child(
      S.list()
        .title("Form Building Blocks")
        .items([
          S.documentTypeListItem("formField").title("Form Fields"),
          S.documentTypeListItem("formSection").title("Form Sections"),
        ]),
    );

export const deskStructure = (S: StructureBuilder) =>
  S.list()
    .title("Content")
    .items([
      singletonListItem(S, "siteSettings", "Site Settings"),
      singletonListItem(S, "theme", "Theme"),
      S.divider(),
      pagesGroup(S),
      emailsGroup(S),
      formBuildingBlocksGroup(S),
      S.divider(),
      S.documentTypeListItem("reading").title("Readings"),
      S.documentTypeListItem("testimonial").title("Testimonials"),
      S.documentTypeListItem("faqItem").title("FAQ Items"),
      S.divider(),
      S.documentTypeListItem("legalPage").title("Legal Pages"),
      S.divider(),
      submissionsRoot(S),
    ]);
