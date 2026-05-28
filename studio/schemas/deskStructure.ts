import type { ComponentType } from "react";
import type { StructureBuilder } from "sanity/structure";

import { EmailPreview } from "../views/EmailPreview";
import {
  GiftClaimPagePreview,
  GiftIntakePagePreview,
  ListenPagePreview,
  MagicLinkVerifyPagePreview,
  MyGiftsPagePreview,
  MyReadingsPagePreview,
} from "../views/StudioPagePreview";

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
  "myGiftsPage",
  "magicLinkVerifyPage",
  "emailMagicLink",
  "emailMagicLinkLibrary",
  "emailDay7Delivery",
  "emailOrderConfirmation",
  "emailGiftPurchaseConfirmationSelfSend",
  "emailGiftPurchaseConfirmationScheduled",
  "emailGiftClaim",
  "emailGiftClaimReminder",
  "emailRecipientIntakeReceived",
  "emailPrivacyExport",
  "emailStepUpOtp",
  "emailNewDeviceNotice",
  "emailSharedShell",
  "giftClaimPage",
  "giftIntakePage",
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
          singletonListItem(S, "thankYouPage", "Thank You Page"),
          singletonListItem(S, "bookingForm", "Booking Form"),
          singletonListItem(S, "bookingGiftForm", "Booking Gift Form"),
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
          pagePreviewSingletonListItem(S, "myReadingsPage", "My Readings Page", MyReadingsPagePreview),
          pagePreviewSingletonListItem(S, "myGiftsPage", "My Gifts Page", MyGiftsPagePreview),
          pagePreviewSingletonListItem(
            S,
            "magicLinkVerifyPage",
            "Magic Link — Confirm Email Page",
            MagicLinkVerifyPagePreview,
          ),
          pagePreviewSingletonListItem(
            S,
            "giftClaimPage",
            "Gift Claim Page (recipient lands here)",
            GiftClaimPagePreview,
          ),
          pagePreviewSingletonListItem(
            S,
            "giftIntakePage",
            "Gift Intake Page (recipient fills details)",
            GiftIntakePagePreview,
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
          emailSingletonListItem(
            S,
            "emailGiftPurchaseConfirmationSelfSend",
            "Gift Confirmation → Purchaser (Self-Send)",
          ),
          emailSingletonListItem(
            S,
            "emailGiftPurchaseConfirmationScheduled",
            "Gift Confirmation → Purchaser (Scheduled)",
          ),
          emailSingletonListItem(S, "emailGiftClaim", "Gift Claim → Recipient (First Send)"),
          emailSingletonListItem(
            S,
            "emailGiftClaimReminder",
            "Gift Claim → Recipient (Reminder)",
          ),
          emailSingletonListItem(
            S,
            "emailRecipientIntakeReceived",
            "Intake Received → Gift Recipient",
          ),
          emailSingletonListItem(S, "emailDay7Delivery", "Reading Delivery → Customer"),
          emailSingletonListItem(S, "emailMagicLink", "Magic Link → Listen Page"),
          emailSingletonListItem(S, "emailMagicLinkLibrary", "Magic Link → Library"),
          emailSingletonListItem(S, "emailStepUpOtp", "Step-up code → Purchaser"),
          emailSingletonListItem(S, "emailNewDeviceNotice", "New device notice → Customer"),
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
