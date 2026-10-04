import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import { EMAIL_GIFT_PURCHASE_DEFAULTS, EMAIL_SHARED_SHELL_DEFAULTS } from "@/data/defaults";

import { GiftPurchase, type GiftPurchaseVars } from "./GiftPurchase";
import { stringToPortableTextBlocks } from "./portableTextBuild";
import { linkHrefs, visibleText } from "./test-helpers";

const VARS: GiftPurchaseVars = {
  firstName: "Dana",
  readingName: "Birth Chart Reading",
  hasNote: true,
  displayCode: "K7M2-QX9P-H4TR",
  giftUrl: "https://withjosephine.com/gift/K7M2QX9PH4TR",
  whatsappUrl: "https://wa.me/?text=A%20reading%20for%20you",
  sendUrl: "https://withjosephine.com/gift/send#token123",
};

async function renderGift(vars: GiftPurchaseVars = VARS, copy = EMAIL_GIFT_PURCHASE_DEFAULTS) {
  return render(<GiftPurchase vars={vars} copy={copy} shell={EMAIL_SHARED_SHELL_DEFAULTS} />);
}

describe("GiftPurchase", () => {
  it("renders the default copy with firstName and readingName filled in", async () => {
    const text = visibleText(await renderGift());
    expect(text).toContain("A reading, ready for them");
    expect(text).toContain("Hi Dana,");
    expect(text).toContain("Thank you for gifting a Birth Chart Reading.");
    expect(text).toContain("The gift");
    expect(text).toContain("For the Birth Chart Reading · does not expire");
    expect(text).toContain("Gifts are non-refundable once payment is complete.");
  });

  it("renders the code, the gift link, the WhatsApp link and the send link from props", async () => {
    const html = await renderGift();
    const text = visibleText(html);
    const hrefs = linkHrefs(html);
    expect(text).toContain("K7M2-QX9P-H4TR");
    expect(text).toContain(VARS.giftUrl);
    expect(text).toContain("Share on WhatsApp");
    expect(text).toContain("Send it by email from Josephine");
    expect(hrefs.has(VARS.giftUrl)).toBe(true);
    expect(hrefs.has(VARS.whatsappUrl)).toBe(true);
    expect(hrefs.has(VARS.sendUrl)).toBe(true);
  });

  it("shows the note line only when the gift has a note", async () => {
    const withNote = visibleText(await renderGift());
    const withoutNote = visibleText(await renderGift({ ...VARS, hasNote: false }));
    expect(withNote).toContain("They'll see your note when they open it.");
    expect(withoutNote).not.toContain("They'll see your note when they open it.");
  });

  it("leaves a {code} token in Sanity copy unexpanded", async () => {
    const copy = {
      ...EMAIL_GIFT_PURCHASE_DEFAULTS,
      body: stringToPortableTextBlocks("Your code is {code}, link {giftUrl}, send {sendUrl}."),
    };
    const text = visibleText(await renderGift(VARS, copy));
    expect(text).toContain("Your code is {code}, link {giftUrl}, send {sendUrl}.");
  });

  it("escapes HTML in the buyer's first name", async () => {
    const html = await renderGift({ ...VARS, firstName: "<script>x</script>" });
    expect(html).not.toContain("<script>x</script>");
  });
});
