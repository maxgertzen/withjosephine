import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import { EMAIL_RECIPIENT_INTAKE_RECEIVED_DEFAULTS } from "@/data/defaults";

import { RecipientIntakeReceived } from "./RecipientIntakeReceived";
import { visibleText } from "./test-helpers";

const VARS = {
  recipientName: "Roland",
  purchaserFirstName: "Marco",
  readingName: "Soul Blueprint",
};

describe("RecipientIntakeReceived — visual parity with locked copy", () => {
  it("renders header lines from Sanity-driven copy", async () => {
    const text = visibleText(
      await render(
        <RecipientIntakeReceived
          vars={VARS}
          copy={EMAIL_RECIPIENT_INTAKE_RECEIVED_DEFAULTS}
        />,
      ),
    );
    expect(text).toContain("Josephine");
    expect(text).toContain("Soul Readings");
    expect(text).toContain("Your reading is in my hands");
  });

  it("substitutes recipientName / purchaserFirstName / readingName in body", async () => {
    const text = visibleText(
      await render(
        <RecipientIntakeReceived
          vars={VARS}
          copy={EMAIL_RECIPIENT_INTAKE_RECEIVED_DEFAULTS}
        />,
      ),
    );
    expect(text).toContain("Hi Roland,");
    expect(text).toContain("Marco gifted you a Soul Blueprint");
    expect(text).not.toContain("{recipientName}");
    expect(text).not.toContain("{purchaserFirstName}");
    expect(text).not.toContain("{readingName}");
  });

  it("renders the reading card with the reading name + delivery line, no price", async () => {
    const text = visibleText(
      await render(
        <RecipientIntakeReceived
          vars={VARS}
          copy={EMAIL_RECIPIENT_INTAKE_RECEIVED_DEFAULTS}
        />,
      ),
    );
    expect(text).toContain("Your reading");
    expect(text).toContain("Soul Blueprint");
    expect(text).toContain("Delivery within 7 days");
    expect(text).not.toMatch(/\$\d/);
  });

  it("renders the contact + sign-off + footer disclaimer", async () => {
    const text = visibleText(
      await render(
        <RecipientIntakeReceived
          vars={VARS}
          copy={EMAIL_RECIPIENT_INTAKE_RECEIVED_DEFAULTS}
        />,
      ),
    );
    expect(text).toContain("hello@withjosephine.com");
    expect(text).toContain("withjosephine.com");
    expect(text).toContain("With love,");
    expect(text).toContain("Josephine ✦");
    expect(text).toContain("Readings are offered for entertainment");
  });

  it("recipient-bearer email does NOT include any library button or library URL", async () => {
    const html = await render(
      <RecipientIntakeReceived
        vars={VARS}
        copy={EMAIL_RECIPIENT_INTAKE_RECEIVED_DEFAULTS}
      />,
    );
    expect(html).not.toContain("/my-readings/welcome");
    expect(html).not.toContain("libraryUrl");
    expect(html).not.toContain("See all your readings");
  });
});
