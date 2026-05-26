import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import { EMAIL_SHARED_SHELL_DEFAULTS, STEP_UP_OTP_EMAIL_DEFAULTS } from "@/data/defaults";

import { StepUpOtp } from "./StepUpOtp";
import { assertBrandTokens, visibleText } from "./test-helpers";

const CODE = "428913";

describe("StepUpOtp email", () => {
  it("renders the 6-digit code in the body", async () => {
    const text = visibleText(
      await render(<StepUpOtp code={CODE} copy={STEP_UP_OTP_EMAIL_DEFAULTS} />),
    );
    expect(text).toContain(CODE);
  });

  it("renders hero line, intro, expiry, and closing copy from Sanity-supplied content", async () => {
    const text = visibleText(
      await render(<StepUpOtp code={CODE} copy={STEP_UP_OTP_EMAIL_DEFAULTS} />),
    );
    expect(text).toContain(STEP_UP_OTP_EMAIL_DEFAULTS.heroLine);
    expect(text).toContain(STEP_UP_OTP_EMAIL_DEFAULTS.intro);
    expect(text).toContain(STEP_UP_OTP_EMAIL_DEFAULTS.codeLabel);
    expect(text).toContain(STEP_UP_OTP_EMAIL_DEFAULTS.expiryLine);
    expect(text).toContain(STEP_UP_OTP_EMAIL_DEFAULTS.closingLine);
  });

  it("renders the brand header", async () => {
    const text = visibleText(
      await render(<StepUpOtp code={CODE} copy={STEP_UP_OTP_EMAIL_DEFAULTS} />),
    );
    expect(text).toContain(EMAIL_SHARED_SHELL_DEFAULTS.brandName);
    expect(text).toContain(EMAIL_SHARED_SHELL_DEFAULTS.brandSubtitle);
  });

  it("renders the code in a monospace block with the brand letter-spacing", async () => {
    const html = await render(<StepUpOtp code={CODE} copy={STEP_UP_OTP_EMAIL_DEFAULTS} />);
    expect(html).toMatch(/letter-spacing:0\.25em/);
    expect(html).toMatch(/font-size:28px/);
    expect(html.toLowerCase()).toMatch(/monospace|menlo|monaco|consolas/);
  });

  it("renders the code box with the cream background token", async () => {
    const html = await render(<StepUpOtp code={CODE} copy={STEP_UP_OTP_EMAIL_DEFAULTS} />);
    // Inline style is the literal cream hex (the design spec); EmailShell + footer
    // also pull cream via the Tailwind provider, so just assert the literal here.
    expect(html).toContain("#FAF8F4");
  });

  it("uses brand tokens (ink, cream, muted) somewhere in the render", async () => {
    const html = await render(<StepUpOtp code={CODE} copy={STEP_UP_OTP_EMAIL_DEFAULTS} />);
    expect(() => assertBrandTokens(html, { ink: true, cream: true, muted: true })).not.toThrow();
  });

  it("honors shared-shell signoff overrides via the footer", async () => {
    const text = visibleText(
      await render(
        <StepUpOtp
          code={CODE}
          copy={STEP_UP_OTP_EMAIL_DEFAULTS}
          shell={{ ...EMAIL_SHARED_SHELL_DEFAULTS, signOffLine1: "In peace,", signOffLine2: "J." }}
        />,
      ),
    );
    expect(text).toContain("In peace,");
    expect(text).toContain("J.");
  });

  it("default copy contains no em-dashes", () => {
    const fields = [
      STEP_UP_OTP_EMAIL_DEFAULTS.subject,
      STEP_UP_OTP_EMAIL_DEFAULTS.preview,
      STEP_UP_OTP_EMAIL_DEFAULTS.heroLine,
      STEP_UP_OTP_EMAIL_DEFAULTS.intro,
      STEP_UP_OTP_EMAIL_DEFAULTS.codeLabel,
      STEP_UP_OTP_EMAIL_DEFAULTS.expiryLine,
      STEP_UP_OTP_EMAIL_DEFAULTS.closingLine,
      STEP_UP_OTP_EMAIL_DEFAULTS.signoff,
    ];
    for (const value of fields) {
      expect(value).not.toMatch(/—/);
    }
  });
});
