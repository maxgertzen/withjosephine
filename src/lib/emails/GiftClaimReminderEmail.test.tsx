import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import { EMAIL_GIFT_CLAIM_REMINDER_DEFAULTS, EMAIL_SHARED_SHELL_DEFAULTS } from "@/data/defaults";

import { GiftClaimReminderEmail } from "./GiftClaimReminderEmail";
import { visibleText } from "./test-helpers";

const VARS = {
  recipientName: "Mira",
  purchaserFirstName: "Lior",
  readingName: "Soul Blueprint",
  readingPriceDisplay: "$179",
  giftMessage: null,
};

describe("GiftClaimReminderEmail", () => {
  it("renders the recipient + purchaser names", async () => {
    const text = visibleText(
      await render(
        <GiftClaimReminderEmail vars={VARS} copy={EMAIL_GIFT_CLAIM_REMINDER_DEFAULTS} shell={EMAIL_SHARED_SHELL_DEFAULTS} />,
      ),
    );
    expect(text).toContain("Mira");
    expect(text).toContain("Lior");
  });

  it("does NOT include a claim URL or claim button", async () => {
    const html = await render(
      <GiftClaimReminderEmail vars={VARS} copy={EMAIL_GIFT_CLAIM_REMINDER_DEFAULTS} shell={EMAIL_SHARED_SHELL_DEFAULTS} />,
    );
    expect(html).not.toContain("/gift/claim?token=");
    expect(html).not.toContain("Open your gift");
  });

  it("points the recipient at the contact email", async () => {
    const text = visibleText(
      await render(
        <GiftClaimReminderEmail vars={VARS} copy={EMAIL_GIFT_CLAIM_REMINDER_DEFAULTS} shell={EMAIL_SHARED_SHELL_DEFAULTS} />,
      ),
    );
    expect(text).toContain("hello@withjosephine.com");
  });

  it("renders the new body PT path when copy.body has content", async () => {
    const text = visibleText(
      await render(
        <GiftClaimReminderEmail vars={VARS} copy={EMAIL_GIFT_CLAIM_REMINDER_DEFAULTS} shell={EMAIL_SHARED_SHELL_DEFAULTS} />,
      ),
    );
    expect(text).toContain("I sent you a note from Lior");
    expect(text).toContain("Soul Blueprint");
  });
});
