import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ThankYouView, type ThankYouViewCopy } from "./ThankYouView";

vi.mock("@/components/ThankYouGuard", () => ({
  ThankYouGuard: () => null,
}));
vi.mock("@/components/StarField", () => ({
  StarField: () => null,
}));
vi.mock("@/components/CelestialOrb", () => ({
  CelestialOrb: () => null,
}));
vi.mock("@/components/Footer", () => ({
  Footer: () => null,
}));
vi.mock("@/components/GoldDivider", () => ({
  GoldDivider: () => null,
}));
vi.mock("@/components/Button", () => ({
  Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));

const copy: ThankYouViewCopy = {
  heading: "Thank you.",
  subheading: "Subheading.",
  readingLabel: "Your Reading",
  confirmationBody: "Confirm.",
  timelineBody: "Timeline.",
  contactBody: "Contact.",
  closingMessage: "Closing.",
  returnButtonText: "Home",
  deliveryDaysPhrase: "seven days",
};

const reading = { name: "Soul Blueprint", price: "$179", cents: 17900 };

describe("ThankYouView discount-rendering branch", () => {
  it("renders the strikethrough list price when paidAmount.cents is strictly below reading.cents", () => {
    const { container } = render(
      <ThankYouView
        reading={reading}
        paidAmount={{ cents: 9900, display: "$99.00" }}
        contactEmail="hello@withjosephine.com"
        copy={copy}
      />,
    );
    expect(container.querySelector(".line-through")).not.toBeNull();
    expect(container.textContent).toContain("$179");
    expect(container.textContent).toContain("$99.00");
  });

  it("renders only the paid amount when paidAmount equals the list price", () => {
    const { container } = render(
      <ThankYouView
        reading={reading}
        paidAmount={{ cents: 17900, display: "$179.00" }}
        contactEmail="hello@withjosephine.com"
        copy={copy}
      />,
    );
    expect(container.querySelector(".line-through")).toBeNull();
    expect(container.textContent).toContain("$179.00");
  });

  it("does not strike when paid is HIGHER than list (Stripe / Sanity drift)", () => {
    const { container } = render(
      <ThankYouView
        reading={reading}
        paidAmount={{ cents: 22900, display: "$229.00" }}
        contactEmail="hello@withjosephine.com"
        copy={copy}
      />,
    );
    expect(container.querySelector(".line-through")).toBeNull();
  });

  it("falls back to the list price string when paidAmount.display is null", () => {
    const { container } = render(
      <ThankYouView
        reading={reading}
        paidAmount={{ cents: null, display: null }}
        contactEmail="hello@withjosephine.com"
        copy={copy}
      />,
    );
    expect(container.querySelector(".line-through")).toBeNull();
    expect(container.textContent).toContain("$179");
  });
});
