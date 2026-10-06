import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import { EMAIL_GIFT_TO_RECIPIENT_DEFAULTS, EMAIL_SHARED_SHELL_DEFAULTS } from "@/data/defaults";

import { GiftToRecipient, type GiftToRecipientVars } from "./GiftToRecipient";
import { linkHrefs, visibleText } from "./test-helpers";

const GIFT_URL = "https://withjosephine.com/gift/7KQ2M9XW4HBT";

const VARS: GiftToRecipientVars = {
  firstName: "Anna",
  buyerName: "Dana",
  readingName: "Birth Chart Reading",
  displayCode: "7KQ2-M9XW-4HBT",
  giftUrl: GIFT_URL,
  note: "Happy birthday, Anna.",
};

const BODY =
  "Dana has given you a Birth Chart Reading with me. When you’re ready, tap below. A short form follows, so I know what to read for you, and the reading lands in your inbox within seven days.";

async function renderGift(vars: GiftToRecipientVars = VARS) {
  return render(
    <GiftToRecipient
      vars={vars}
      copy={EMAIL_GIFT_TO_RECIPIENT_DEFAULTS}
      shell={EMAIL_SHARED_SHELL_DEFAULTS}
    />,
  );
}

describe("GiftToRecipient", () => {
  it("shows the note card with the buyer's note, the body and the gift box", async () => {
    const text = visibleText(await renderGift());
    expect(text).toContain("A reading, for you");
    expect(text).toContain("Hi Anna,");
    expect(text).toContain(BODY);
    expect(text).toContain("A note from Dana");
    expect(text).toContain("Happy birthday, Anna.");
    expect(text).toContain("The gift");
    expect(text).toContain("Delivered within 7 days of your intake");
  });

  it("renders a note with a slot and markup literally", async () => {
    const note = "Your code is {code} <b>enjoy</b> {buyerName}";
    const html = await renderGift({ ...VARS, note });
    expect(visibleText(html)).toContain(note);
    expect(html).not.toContain("<b>enjoy</b>");
    expect(visibleText(html)).not.toContain("Your code is 7KQ2-M9XW-4HBT");
  });

  it.each([null, ""])(
    "has no note card for note %j, with the same body and gift box",
    async (note) => {
      const text = visibleText(await renderGift({ ...VARS, note }));
      expect(text).not.toContain("A note from Dana");
      expect(text).toContain(BODY);
      expect(text).toContain("The gift");
      expect(text).toContain("Birth Chart Reading");
      expect(text).toContain("Delivered within 7 days of your intake");
    },
  );

  it("shows the dashed code in the fallback line", async () => {
    const text = visibleText(await renderGift());
    expect(text).toContain("The code is 7KQ2-M9XW-4HBT, if the button doesn’t work.");
  });

  it("links the open button to the gift URL", async () => {
    const html = await renderGift();
    expect(visibleText(html)).toContain("Open your gift");
    expect([...linkHrefs(html)]).toContain(GIFT_URL);
  });

  it("shows the privacy line and the shared sign-off", async () => {
    const text = visibleText(await renderGift());
    expect(text).toContain(
      "Dana gave me your name and email address to send you this gift. Your email address is used for this email only and deleted once it is sent.",
    );
    expect(text).toContain("With love,Josephine ✦");
  });

  it("escapes HTML in the recipient's name", async () => {
    const html = await renderGift({ ...VARS, firstName: "<script>x</script>" });
    expect(html).not.toContain("<script>x</script>");
  });
});
