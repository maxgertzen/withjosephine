import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import { EMAIL_PRIVACY_EXPORT_DEFAULTS } from "@/data/defaults";

import { portableTextToPlainText } from "./PortableTextBody";
import { PrivacyExport } from "./PrivacyExport";
import { linkHrefs, visibleText } from "./test-helpers";

const VARS = {
  firstName: "Ada",
  downloadUrl: "https://r2.withjosephine.com/exports/abc123.zip",
  submissionCount: 3,
  expiryDays: 7,
};

describe("PrivacyExport email", () => {
  it("renders body intro from copy", async () => {
    const text = visibleText(
      await render(<PrivacyExport vars={VARS} copy={EMAIL_PRIVACY_EXPORT_DEFAULTS} />),
    );
    const expected = portableTextToPlainText(EMAIL_PRIVACY_EXPORT_DEFAULTS.bodyIntro).replace(
      "{submissionCount}",
      String(VARS.submissionCount),
    );
    for (const paragraph of expected.split("\n\n")) {
      expect(text).toContain(paragraph);
    }
  });

  it("interpolates submissionCount into the body intro", async () => {
    const text = visibleText(
      await render(<PrivacyExport vars={VARS} copy={EMAIL_PRIVACY_EXPORT_DEFAULTS} />),
    );
    expect(text).toContain("for your 3 reading(s)");
  });

  it("interpolates expiryDays into the body post-button", async () => {
    const text = visibleText(
      await render(<PrivacyExport vars={VARS} copy={EMAIL_PRIVACY_EXPORT_DEFAULTS} />),
    );
    expect(text).toContain("expires in 7 days");
  });

  it("renders the download URL as a button href", async () => {
    const html = await render(
      <PrivacyExport vars={VARS} copy={EMAIL_PRIVACY_EXPORT_DEFAULTS} />,
    );
    expect(linkHrefs(html).has(VARS.downloadUrl)).toBe(true);
  });

  it("renders the default sign-off when copy.signOff is null", async () => {
    const text = visibleText(
      await render(<PrivacyExport vars={VARS} copy={EMAIL_PRIVACY_EXPORT_DEFAULTS} />),
    );
    expect(text).toContain("Josephine ✦");
  });

  it("honors shared-shell signoff overrides", async () => {
    const { EMAIL_SHARED_SHELL_DEFAULTS } = await import("@/data/defaults");
    const text = visibleText(
      await render(
        <PrivacyExport
          vars={VARS}
          copy={EMAIL_PRIVACY_EXPORT_DEFAULTS}
          shell={{ ...EMAIL_SHARED_SHELL_DEFAULTS, signOffLine1: "In peace,", signOffLine2: "J." }}
        />,
      ),
    );
    expect(text).toContain("In peace,");
    expect(text).toContain("J.");
  });
});
