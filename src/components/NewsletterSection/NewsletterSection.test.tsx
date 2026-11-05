import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { footerNewsletterSlot } from "@/components/Footer/footerNewsletterSlot";
import { NewsletterSlotProvider } from "@/components/Footer/NewsletterContext";
import type { NewsletterContent } from "@/data/defaults";

import { NewsletterSection } from "./NewsletterSection";

function renderSection(stored: Partial<NewsletterContent>) {
  render(
    <NewsletterSlotProvider slot={footerNewsletterSlot(stored)}>
      <NewsletterSection fallback={<p>divider</p>} />
    </NewsletterSlotProvider>,
  );
}

describe("NewsletterSection", () => {
  it("shows Becky's newsletter words and the sign-up form while the box is on", async () => {
    renderSection({ show: true, title: "Letters" });

    expect(screen.getByRole("heading", { name: "Letters" })).toBeInTheDocument();
    expect(await screen.findByRole("checkbox")).not.toBeChecked();
    expect(screen.queryByText("divider")).toBeNull();
  });

  it.each([
    ["switch off", { show: false }],
    ["switch never set", {}],
  ])("shows the fallback instead with the %s", (_case, stored) => {
    renderSection(stored);

    expect(screen.getByText("divider")).toBeInTheDocument();
    expect(screen.queryByRole("heading")).toBeNull();
  });
});
