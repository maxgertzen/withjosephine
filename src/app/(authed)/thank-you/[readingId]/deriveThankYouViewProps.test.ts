import { describe, expect, it } from "vitest";

import { GIFT_DEFAULTS } from "@/data/defaults";
import { CONTACT_EMAIL } from "@/lib/constants";
import type { SanitySiteSettings, SanityThankYouPage } from "@/lib/sanity/types";

import {
  deriveThankYouViewProps,
  type ResolvedThankYouContext,
} from "./deriveThankYouViewProps";

function context(overrides: Partial<ResolvedThankYouContext> = {}): ResolvedThankYouContext {
  return {
    reading: { name: "The Soul Blueprint", price: "$179", cents: 179_00 },
    paidAmount: { cents: 179_00, display: "$179.00" },
    ...overrides,
  };
}

describe("deriveThankYouViewProps", () => {
  it("falls through to hardcoded defaults when Sanity returns null (purchase mode)", () => {
    const props = deriveThankYouViewProps({
      context: context(),
      thankYouPageContent: null,
      siteSettings: null,
      slugForOverride: "soul-blueprint",
    });
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

describe("deriveThankYouViewProps for a gift recipient", () => {
  const giftContext = context({
    reading: { name: "Birth Chart Reading", price: null, cents: null },
    paidAmount: { cents: null, display: null },
  });

  function derive(buyerFirstName: string, thankYouPageContent: SanityThankYouPage | null = null) {
    return deriveThankYouViewProps({
      context: giftContext,
      thankYouPageContent,
      siteSettings: null,
      slugForOverride: "birth-chart",
      gift: { recipientName: "Anna", buyerFirstName, giftCopy: GIFT_DEFAULTS },
    });
  }

  it("uses the gift heading, subheading, card label and timeline with the gift icon", () => {
    const props = derive("Dana");
    expect(props.icon).toBe("gift");
    expect(props.reading.price).toBeNull();
    expect(props.copy).toMatchObject({
      heading: "Thank you, Anna. Your reading is in my hands now.",
      subheading: "I’ve received everything I need to begin.",
      readingLabel: "Your gift, from Dana",
      timelineBody: GIFT_DEFAULTS.recipientThankYouTimelineTemplate,
      deliveryDaysPhrase: "seven days",
    });
  });

  it("uses the no-buyer card label when the buyer name is empty", () => {
    expect(derive("").copy.readingLabel).toBe("Your gift");
  });

  it("keeps the thank-you page copy and a reading override for everything else", () => {
    const sanity = {
      confirmationBody: "Custom confirmation",
      closingMessage: "Generic closing",
      deliveryDaysPhrase: "ten days",
      overrides: [
        {
          readingSlug: "birth-chart",
          heading: "Override heading",
          closingMessage: "Override closing",
        },
      ],
    } as unknown as SanityThankYouPage;
    const props = derive("Dana", sanity);
    expect(props.copy.heading).toBe("Thank you, Anna. Your reading is in my hands now.");
    expect(props.copy.confirmationBody).toBe("Custom confirmation");
    expect(props.copy.closingMessage).toBe("Override closing");
    expect(props.copy.deliveryDaysPhrase).toBe("ten days");
  });

  it("sets no icon for a reading", () => {
    const props = deriveThankYouViewProps({
      context: context(),
      thankYouPageContent: null,
      siteSettings: null,
      slugForOverride: "soul-blueprint",
    });
    expect(props).not.toHaveProperty("icon");
  });
});
