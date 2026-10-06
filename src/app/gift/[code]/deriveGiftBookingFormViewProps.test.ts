import { describe, expect, it } from "vitest";

import type { BookingFormViewProps } from "@/app/book/[readingId]/BookingFormView";
import { GIFT_FOLD_COPY_KEYS } from "@/components/GiftFold/giftFoldCopy";
import { SOUL_BLUEPRINT_BLOCK } from "@/components/ReadingBlock/readingBlockFixture";
import { GIFT_DEFAULTS } from "@/data/defaults";
import { pick } from "@/lib/pick";

import { deriveGiftBookingFormViewProps } from "./deriveGiftBookingFormViewProps";

const CODE = "K7M2QX9PH4TR";

const BASE: BookingFormViewProps = {
  nav: {},
  backHref: "/#reading-birth-chart",
  reading: {
    slug: "birth-chart",
    tag: "Astrology",
    name: "Birth Chart Reading",
    priceLabel: "$89",
  },
  readingBlock: {
    ...SOUL_BLUEPRINT_BLOCK,
    otherReadings: {
      title: "Not sure this is the one?",
      readings: [
        { name: "Soul Blueprint", price: "$129", line: "Everything", slug: "soul-blueprint" },
      ],
    },
  },
  copy: { intro: [] },
  form: {
    sections: [],
    nonRefundableNotice: "Non-refundable.",
    switchNotice: "Switched.",
    submitLabel: "Continue to payment →",
    pageIndicatorTagline: "about 8 minutes",
  },
};

const GIFT_FOLD: NonNullable<BookingFormViewProps["giftFold"]> = {
  readingSlug: "birth-chart",
  copy: pick(GIFT_DEFAULTS, GIFT_FOLD_COPY_KEYS),
  giftSheet: {
    reading: { slug: "birth-chart", name: "Birth Chart Reading", price: "$89" },
    content: GIFT_DEFAULTS,
    endpoint: null,
  },
  redeemSheet: { readingSlug: "birth-chart", content: GIFT_DEFAULTS, endpoint: null },
};

function derive(gift: Partial<{ buyerFirstName: string; note: string | null }> = {}) {
  return deriveGiftBookingFormViewProps(
    BASE,
    { code: CODE, buyerFirstName: "Dana", note: "For your birthday.", ...gift },
    GIFT_DEFAULTS,
  );
}

describe("deriveGiftBookingFormViewProps", () => {
  it("adds the gift price line and keeps the reading price for leaving gift mode", () => {
    const props = derive();

    expect(props.gift?.priceLine).toBe("A gift, already paid");
    expect(props.reading).toEqual(BASE.reading);
  });

  it("empties the other readings so the box is hidden", () => {
    expect(derive().readingBlock.otherReadings.readings).toEqual([]);
  });

  it("drops the gift row of the booking page", () => {
    const props = deriveGiftBookingFormViewProps(
      { ...BASE, giftFold: GIFT_FOLD },
      { code: CODE, buyerFirstName: "Dana", note: null },
      GIFT_DEFAULTS,
    );

    expect(props.giftFold).toBeUndefined();
  });

  it("ends the gift page line with the buyer's name", () => {
    const props = derive();

    expect(props.form.gift?.overrides.pageIndicatorTagline).toBe(
      "about 8 minutes · a gift from Dana",
    );
    expect(props.form.pageIndicatorTagline).toBe("about 8 minutes");
  });

  it("builds the note card from the buyer's name and note", () => {
    expect(derive().gift?.noteCard).toEqual({
      label: "A note from Dana",
      note: "For your birthday.",
      foot: "This reading is already paid for.",
      draftRestoredNotice: "Welcome back. Your answers are saved.",
    });
  });

  it("leaves a {code} typed in the note as typed", () => {
    expect(derive({ note: "Use {code} at {buyerName}" }).gift?.noteCard.note).toBe(
      "Use {code} at {buyerName}",
    );
  });

  it("uses the no-buyer keys and drops the buyer lines when the buyer name is empty", () => {
    const props = derive({ buyerFirstName: "" });

    expect(props.gift?.noteCard).toMatchObject({
      label: "A reading, given",
      note: "Someone sent you this reading.",
      foot: "It’s already paid for.",
    });
    expect(props.form.gift?.overrides.pageIndicatorTagline).toBe("about 8 minutes");
    expect(props.form.gift?.finalPage).toMatchObject({
      giftFoot: GIFT_DEFAULTS.giftFootNoBuyer,
      openedNotice: null,
    });
  });

  it("passes the undashed code and the display code to the form", () => {
    expect(derive().form.gift?.code).toBe(CODE);
    expect(derive().form.gift?.finalPage.displayCode).toBe("K7M2-QX9P-H4TR");
  });

  it("fills the buyer's name into the final page lines", () => {
    expect(derive().form.gift?.finalPage).toMatchObject({
      giftFoot: "Nothing to pay. This reading is a gift from Dana.",
      openedNotice: expect.stringContaining("Dana gets a short email"),
    });
  });

  it("sends the gift submit label, overlay text and error messages to the form", () => {
    const gift = derive().form.gift;

    expect(gift?.overrides).toMatchObject({
      submitLabel: GIFT_DEFAULTS.sendDetailsLabel,
      loadingStateCopy: GIFT_DEFAULTS.sendingDetailsOverlay,
    });
    expect(gift?.errors).toEqual({
      ending: {
        gift_already_redeemed: GIFT_DEFAULTS.openedRaceError,
        gift_not_found: `${GIFT_DEFAULTS.notFoundHeading}. ${GIFT_DEFAULTS.notFoundBody}`,
        gift_not_active: `${GIFT_DEFAULTS.noLongerActiveHeading}. ${GIFT_DEFAULTS.noLongerActiveBody}`,
      },
      tooManyTries: GIFT_DEFAULTS.codeTooManyTries,
    });
  });

  it("keeps the base submit label for after a lost race", () => {
    expect(derive().form.submitLabel).toBe("Continue to payment →");
  });
});
