import { describe, expect, it } from "vitest";

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
