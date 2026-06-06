import { describe, expect, it } from "vitest";

import { GIFT_DELIVERY } from "@/lib/booking/constants";
import type { SubmissionRecord } from "@/lib/booking/submissions";
import { CONTACT_EMAIL } from "@/lib/constants";
import type { SanitySiteSettings, SanityThankYouPage } from "@/lib/sanity/types";

import {
  deriveThankYouViewProps,
  type ResolvedThankYouContext,
} from "./deriveThankYouViewProps";

function context(overrides: Partial<ResolvedThankYouContext> = {}): ResolvedThankYouContext {
  return {
    mode: "purchase",
    reading: { name: "The Soul Blueprint", price: "$179", cents: 179_00 },
    paidAmount: { cents: 179_00, display: "$179.00" },
    submission: null,
    purchaserFirstName: null,
    recipientName: null,
    ...overrides,
  };
}

function selfSendSubmission(): SubmissionRecord {
  return {
    giftDeliveryMethod: GIFT_DELIVERY.selfSend,
  } as unknown as SubmissionRecord;
}

describe("deriveThankYouViewProps", () => {
  it("falls through to hardcoded defaults when Sanity returns null (purchase mode)", () => {
    const props = deriveThankYouViewProps({
      context: context(),
      thankYouPageContent: null,
      siteSettings: null,
      slugForOverride: "soul-blueprint",
    });
    expect(props.mode).toBe("purchase");
    expect(props.copy.heading).toBe("Thank you. I’ve got everything I need.");
    expect(props.copy.readingLabel).toBe("Your Reading");
    expect(props.copy.returnButtonText).toBe("Return to Home");
    expect(props.copy.deliveryDaysPhrase).toBe("seven days");
    expect(props.contactEmail).toBe(CONTACT_EMAIL);
  });

  it("hydrates copy from Sanity when present (purchase mode)", () => {
    const sanity: SanityThankYouPage = {
      heading: "Custom heading",
      subheading: "Custom subheading",
      readingLabel: "Your soul reading",
      confirmationBody: "Custom confirmation",
      timelineBody: "Custom timeline",
      contactBody: "Custom contact",
      closingMessage: "Custom closing",
      returnButtonText: "Take me home",
      deliveryDaysPhrase: "ten days",
    } as SanityThankYouPage;
    const props = deriveThankYouViewProps({
      context: context(),
      thankYouPageContent: sanity,
      siteSettings: null,
      slugForOverride: "soul-blueprint",
    });
    expect(props.copy.heading).toBe("Custom heading");
    expect(props.copy.subheading).toBe("Custom subheading");
    expect(props.copy.confirmationBody).toBe("Custom confirmation");
    expect(props.copy.closingMessage).toBe("Custom closing");
  });

  it("applies a per-reading override when slug matches", () => {
    const sanity = {
      heading: "Generic",
      subheading: "Generic sub",
      overrides: [
        {
          readingSlug: "soul-blueprint",
          heading: "Override heading",
          subheading: "Override sub",
          closingMessage: "Override closing",
        },
      ],
    } as unknown as SanityThankYouPage;
    const props = deriveThankYouViewProps({
      context: context(),
      thankYouPageContent: sanity,
      siteSettings: null,
      slugForOverride: "soul-blueprint",
    });
    expect(props.copy.heading).toBe("Override heading");
    expect(props.copy.closingMessage).toBe("Override closing");
  });

  it("uses giftPurchaser headings when mode is giftPurchaser", () => {
    const props = deriveThankYouViewProps({
      context: context({ mode: "giftPurchaser", purchaserFirstName: "Max" }),
      thankYouPageContent: null,
      siteSettings: null,
      slugForOverride: "soul-blueprint",
    });
    expect(props.copy.heading).toContain("{purchaserFirstName}");
    expect(props.copy.readingLabel).toBe("Your gift");
    expect(props.copy.confirmationBody).toContain("recipient");
  });

  it("uses giftPurchaserSelfSend copy when submission is selfSend delivery", () => {
    const props = deriveThankYouViewProps({
      context: context({
        mode: "giftPurchaser",
        purchaserFirstName: "Max",
        submission: selfSendSubmission(),
      }),
      thankYouPageContent: null,
      siteSettings: null,
      slugForOverride: "soul-blueprint",
    });
    expect(props.copy.subheading).toContain("Your gift link is ready");
    expect(props.copy.confirmationBody).toContain("share link inside");
  });

  it("collapses recipient confirmationBody and recipient timelineBody to the same module-scope default", () => {
    const props = deriveThankYouViewProps({
      context: context({ mode: "giftRecipient", recipientName: "Mira" }),
      thankYouPageContent: null,
      siteSettings: null,
      slugForOverride: "soul-blueprint",
    });
    expect(props.copy.confirmationBody).toBe(props.copy.timelineBody);
    expect(props.copy.confirmationBody).toContain("two days");
    expect(props.copy.confirmationBody).toContain("{deliveryDays}");
  });

  it("collapses recipient contactBody and override-fallback contactBody to the same module-scope default", () => {
    const recipientProps = deriveThankYouViewProps({
      context: context({ mode: "giftRecipient", recipientName: "Mira" }),
      thankYouPageContent: null,
      siteSettings: null,
      slugForOverride: "soul-blueprint",
    });
    const purchaseProps = deriveThankYouViewProps({
      context: context(),
      thankYouPageContent: null,
      siteSettings: null,
      slugForOverride: "soul-blueprint",
    });
    expect(recipientProps.copy.contactBody).toBe(purchaseProps.copy.contactBody);
    expect(recipientProps.copy.contactBody).toContain("{email}");
  });

  it("prefers site-settings contactEmail when present", () => {
    const props = deriveThankYouViewProps({
      context: context(),
      thankYouPageContent: null,
      siteSettings: { contactEmail: "becky@example.com" } as SanitySiteSettings,
      slugForOverride: "soul-blueprint",
    });
    expect(props.contactEmail).toBe("becky@example.com");
  });
});
