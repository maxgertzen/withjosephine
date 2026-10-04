import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import {
  EMAIL_GIFT_RECIPIENT_CONFIRMATION_DEFAULTS,
  EMAIL_SHARED_SHELL_DEFAULTS,
} from "@/data/defaults";

import {
  GiftRecipientConfirmation,
  type GiftRecipientConfirmationVars,
} from "./GiftRecipientConfirmation";
import { linkHrefs, visibleText } from "./test-helpers";

const VARS: GiftRecipientConfirmationVars = {
  firstName: "Anna",
  buyerFirstName: "Dana",
  readingName: "Birth Chart Reading",
  dataExportUrl: "https://withjosephine.com/privacy/export?t=abc",
};

async function renderConfirmation(
  vars: GiftRecipientConfirmationVars = VARS,
  copy = EMAIL_GIFT_RECIPIENT_CONFIRMATION_DEFAULTS,
) {
  return render(
    <GiftRecipientConfirmation vars={vars} copy={copy} shell={EMAIL_SHARED_SHELL_DEFAULTS} />,
  );
}

describe("GiftRecipientConfirmation", () => {
  it("renders the default copy with the recipient, buyer and reading names filled in", async () => {
    const text = visibleText(await renderConfirmation());
    expect(text).toContain("Your reading is in my hands");
    expect(text).toContain("Hi Anna,");
    expect(text).toContain(
      "Thank you for sharing what you did. Dana gifted you a Birth Chart Reading, and I have everything I need now to begin.",
    );
    expect(text).toContain("Your voice note and PDF will arrive within seven days");
    expect(text).toContain("Your reading");
    expect(text).toContain("Delivery within 7 days");
  });

  it("uses buyerNameFallback when the buyer name is empty", async () => {
    const text = visibleText(await renderConfirmation({ ...VARS, buyerFirstName: "" }));
    expect(text).toContain("Someone gifted you a Birth Chart Reading");
  });

  it("shows no price in the reading card", async () => {
    const text = visibleText(await renderConfirmation());
    expect(text).not.toMatch(/\$\d/);
  });

  it("renders the data export line with its link when a URL is given", async () => {
    const html = await renderConfirmation();
    expect(visibleText(html)).toContain("Need a copy of your data? Request an export");
    expect(linkHrefs(html).has(VARS.dataExportUrl as string)).toBe(true);
  });

  it("drops the data export line when there is no URL", async () => {
    const text = visibleText(await renderConfirmation({ ...VARS, dataExportUrl: null }));
    expect(text).not.toContain("Need a copy of your data?");
  });

  it("escapes HTML in the buyer's first name", async () => {
    const html = await renderConfirmation({ ...VARS, buyerFirstName: "<script>x</script>" });
    expect(html).not.toContain("<script>x</script>");
  });
});
