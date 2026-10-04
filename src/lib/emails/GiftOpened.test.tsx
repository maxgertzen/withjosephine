import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import { EMAIL_GIFT_OPENED_DEFAULTS, EMAIL_SHARED_SHELL_DEFAULTS } from "@/data/defaults";

import { GiftOpened, type GiftOpenedVars } from "./GiftOpened";
import { stringToPortableTextBlocks } from "./portableTextBuild";
import { visibleText } from "./test-helpers";

const VARS: GiftOpenedVars = {
  firstName: "Dana",
  recipientName: "Anna",
  readingName: "Birth Chart Reading",
};

async function renderOpened(vars: GiftOpenedVars = VARS, copy = EMAIL_GIFT_OPENED_DEFAULTS) {
  return render(<GiftOpened vars={vars} copy={copy} shell={EMAIL_SHARED_SHELL_DEFAULTS} />);
}

describe("GiftOpened", () => {
  it("renders the default copy with the buyer, recipient and reading names filled in", async () => {
    const text = visibleText(await renderOpened());
    expect(text).toContain("Your gift was opened");
    expect(text).toContain("Hi Dana,");
    expect(text).toContain(
      "Anna opened the Birth Chart Reading you gave them and shared what I need. I’ll have it with them within seven days.",
    );
  });

  it("has no intake answers, even when the vars object carries them", async () => {
    const varsWithAnswers = {
      ...VARS,
      responses: [{ fieldLabelSnapshot: "Birth date", value: "1990-04-12" }],
    } as GiftOpenedVars;
    const text = visibleText(await renderOpened(varsWithAnswers));
    expect(text).not.toContain("Birth date");
    expect(text).not.toContain("1990-04-12");
    expect(text).not.toContain("Responses");
  });

  it("leaves tokens outside its slots unexpanded", async () => {
    const copy = {
      ...EMAIL_GIFT_OPENED_DEFAULTS,
      body: stringToPortableTextBlocks("Code {code}, note {note}."),
    };
    const text = visibleText(await renderOpened(VARS, copy));
    expect(text).toContain("Code {code}, note {note}.");
  });

  it("escapes HTML in the recipient's name", async () => {
    const html = await renderOpened({ ...VARS, recipientName: "<script>x</script>" });
    expect(html).not.toContain("<script>x</script>");
  });
});
