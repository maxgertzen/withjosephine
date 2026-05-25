import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import { EMAIL_PRIVACY_EXPORT_DEFAULTS } from "@/data/defaults";

import { portableTextToPlainText } from "./PortableTextBody";
import { PrivacyExport } from "./PrivacyExport";
import { linkHrefs, visibleText } from "./test-helpers";

const VARS = {
  downloadUrl: "https://r2.withjosephine.com/exports/abc123.zip",
  submissionCount: 3,
  expiryDays: 7,
};

describe("PrivacyExport email", () => {
  it("renders greeting and intro from copy", async () => {
    const text = visibleText(
      await render(<PrivacyExport vars={VARS} copy={EMAIL_PRIVACY_EXPORT_DEFAULTS} />),
    );
    expect(text).toContain(EMAIL_PRIVACY_EXPORT_DEFAULTS.greeting);
    expect(text).toContain(portableTextToPlainText(EMAIL_PRIVACY_EXPORT_DEFAULTS.introLine));
  });

  it("interpolates submissionCount into the contents line", async () => {
    const text = visibleText(
      await render(<PrivacyExport vars={VARS} copy={EMAIL_PRIVACY_EXPORT_DEFAULTS} />),
    );
    expect(text).toContain("for your 3 reading(s)");
  });

  it("interpolates expiryDays into the expiry line", async () => {
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

  it("renders the override sign-off when supplied", async () => {
    const text = visibleText(
      await render(
        <PrivacyExport
          vars={VARS}
          copy={{ ...EMAIL_PRIVACY_EXPORT_DEFAULTS, signOff: "In peace, J." }}
        />,
      ),
    );
    expect(text).toContain("In peace, J.");
  });
});
