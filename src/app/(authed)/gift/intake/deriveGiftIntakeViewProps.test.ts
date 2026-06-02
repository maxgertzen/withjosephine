import { describe, expect, it } from "vitest";

import { GIFT_INTAKE_PAGE_DEFAULTS } from "@/data/defaults";
import type { SubmissionRecord } from "@/lib/booking/submissions";
import type {
  SanityBookingForm,
  SanityFormSection,
  SanityGiftIntakePage,
  SanityReading,
} from "@/lib/sanity/types";

import { deriveGiftIntakeViewProps } from "./deriveGiftIntakeViewProps";

function submission(overrides: Partial<SubmissionRecord> = {}): SubmissionRecord {
  return {
    _id: "sub_test",
    status: "paid",
    email: "purchaser@example.com",
    responses: [],
    createdAt: "2026-06-02T00:00:00.000Z",
    reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$179" },
    amountPaidCents: 17900,
    amountPaidCurrency: "usd",
    recipientUserId: null,
    isGift: true,
    purchaserUserId: null,
    purchaserTimeZone: null,
    recipientEmail: "recipient@example.com",
    giftDeliveryMethod: "scheduled",
    giftSendAt: "2026-06-10T00:00:00.000Z",
    giftMessage: null,
    giftClaimTokenHash: null,
    giftClaimEmailFiredAt: null,
    giftClaimedAt: null,
    giftCancelledAt: null,
    giftClaimSentNowAt: null,
    giftClaimSentNowActor: null,
    giftClaimPriorAlarmAt: null,
    ...overrides,
  } as SubmissionRecord;
}

function reading(overrides: Partial<SanityReading> = {}): SanityReading {
  return {
    _id: "reading-soul-blueprint",
    name: "Soul Blueprint",
    slug: "soul-blueprint",
    tag: "Signature",
    subtitle: "Soul Blueprint Reading",
    price: 179,
    priceDisplay: "$179",
    valueProposition: "",
    briefDescription: "",
    expandedDetails: [],
    includes: [],
    bookingSummary: "",
    requiresBirthChart: true,
    requiresAkashic: true,
    requiresQuestions: true,
    stripePaymentLink: "https://buy.stripe.com/test",
    ...overrides,
  };
}

function bookingForm(overrides: Partial<SanityBookingForm> = {}): SanityBookingForm {
  const everywhereSection: SanityFormSection = {
    _id: "section-everywhere",
    sectionTitle: "Everywhere",
    fields: [
      {
        _id: "field-name",
        key: "first_name",
        label: "First name",
        type: "shortText",
      },
    ],
  };
  const akashicOnly: SanityFormSection = {
    _id: "section-akashic",
    sectionTitle: "Akashic only",
    appliesToServices: ["akashic-record"],
    fields: [
      {
        _id: "field-q",
        key: "question",
        label: "Question",
        type: "shortText",
      },
    ],
  };
  return {
    nonRefundableNotice: "Non-refundable.",
    sections: [everywhereSection, akashicOnly],
    nextButtonText: "Next →",
    saveAndContinueLaterText: "Save & continue later",
    pageIndicatorTagline: "Page",
    ...overrides,
  };
}

const SANITY_COPY: SanityGiftIntakePage = {
  seoTitle: "Open your gift",
  seoDescription: "Share your details",
  eyebrow: "✦ Opening your gift",
  heading: "Let's open your gift.",
  headingWelcome: "Welcome, {recipientName}. Let's open your gift.",
  lede: "Someone sent you a {readingName}. Share your details.",
};

describe("deriveGiftIntakeViewProps", () => {
  it("interpolates the readingName token into the lede", () => {
    const props = deriveGiftIntakeViewProps({
      submission: submission(),
      reading: reading({ name: "Birth Chart Reading" }),
      bookingForm: bookingForm(),
      intakePageCopy: SANITY_COPY,
      welcome: false,
    });
    expect(props.lede).toBe("Someone sent you a Birth Chart Reading. Share your details.");
  });

  it("uses the non-welcome heading verbatim when welcome=false", () => {
    const props = deriveGiftIntakeViewProps({
      submission: submission(),
      reading: reading(),
      bookingForm: bookingForm(),
      intakePageCopy: SANITY_COPY,
      welcome: false,
    });
    expect(props.heading).toBe("Let's open your gift.");
  });

  it("substitutes {recipientName} from purchaserSuppliedRecipientName on welcome heading", () => {
    const props = deriveGiftIntakeViewProps({
      submission: submission({
        responses: [
          { fieldKey: "recipient_name", fieldLabelSnapshot: "", fieldType: "text", value: "Liora" },
        ],
      }),
      reading: reading(),
      bookingForm: bookingForm(),
      intakePageCopy: SANITY_COPY,
      welcome: true,
    });
    expect(props.heading).toBe("Welcome, Liora. Let's open your gift.");
  });

  it("substitutes empty string when no recipient_name response is present on welcome path", () => {
    const props = deriveGiftIntakeViewProps({
      submission: submission(),
      reading: reading(),
      bookingForm: bookingForm(),
      intakePageCopy: SANITY_COPY,
      welcome: true,
    });
    expect(props.heading).toBe("Welcome, . Let's open your gift.");
  });

  it("filters sections via filterSectionsForReading on the reading slug", () => {
    const props = deriveGiftIntakeViewProps({
      submission: submission(),
      reading: reading({ slug: "soul-blueprint" }),
      bookingForm: bookingForm(),
      intakePageCopy: SANITY_COPY,
      welcome: false,
    });
    expect(props.sections.map((s) => s._id)).toEqual(["section-everywhere"]);
  });

  it("falls back to GIFT_INTAKE_PAGE_DEFAULTS when Sanity copy is null", () => {
    const props = deriveGiftIntakeViewProps({
      submission: submission(),
      reading: reading({ name: "Soul Blueprint" }),
      bookingForm: bookingForm(),
      intakePageCopy: null,
      welcome: false,
    });
    expect(props.eyebrow).toBe(GIFT_INTAKE_PAGE_DEFAULTS.eyebrow);
    expect(props.heading).toBe(GIFT_INTAKE_PAGE_DEFAULTS.heading);
    expect(props.lede).toBe(
      GIFT_INTAKE_PAGE_DEFAULTS.lede.replaceAll("{readingName}", () => "Soul Blueprint"),
    );
  });

  it("passes booking-form labels through and uses submission ids", () => {
    const props = deriveGiftIntakeViewProps({
      submission: submission({ _id: "sub_abc", recipientEmail: "r@x.io" }),
      reading: reading(),
      bookingForm: bookingForm(),
      intakePageCopy: SANITY_COPY,
      welcome: false,
    });
    expect(props.submissionId).toBe("sub_abc");
    expect(props.recipientEmail).toBe("r@x.io");
    expect(props.formLabels).toEqual({
      nextLabel: "Next →",
      saveLaterLabel: "Save & continue later",
      pageIndicatorTagline: "Page",
    });
  });
});
