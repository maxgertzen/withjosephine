import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PrivacyFallbackBody } from "./PrivacyFallbackBody";
import { RefundPolicyFallbackBody } from "./RefundPolicyFallbackBody";
import { TermsFallbackBody } from "./TermsFallbackBody";

const paragraphContaining = (container: HTMLElement, text: string) =>
  [...container.querySelectorAll("p")].find((p) => p.textContent?.includes(text))?.textContent;

describe("legal fallback bodies", () => {
  it("Terms states the gift rules after the gift booking sentence", () => {
    const { container } = render(<TermsFallbackBody />);

    expect(paragraphContaining(container, "Gift bookings for someone else")).toContain(
      "has consented to having a reading done for them. A gift is one reading. A gift code does not expire. Gifts are non-refundable.",
    );
  });

  it("Refund Policy says gifts are non-refundable before and after opening, in the first paragraph", () => {
    const { container } = render(<RefundPolicyFallbackBody />);

    expect(container.querySelector("p")?.textContent).toContain(
      "Readings are non-refundable. Gifts are non-refundable, before and after the gift is opened. Each one",
    );
  });

  it("Privacy lists Resend among the US-based processors", () => {
    const { container } = render(<PrivacyFallbackBody />);

    expect(paragraphContaining(container, "Several processors are US-based")).toContain(
      "US-based (Stripe, Sanity, Mixpanel, Microsoft, Resend)",
    );
  });
});
