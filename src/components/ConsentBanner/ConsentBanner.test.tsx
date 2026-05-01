import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ConsentBanner } from "./ConsentBanner";

describe("ConsentBanner", () => {
  it("renders the heading, the body copy, and a privacy-policy link", () => {
    render(<ConsentBanner onAccept={vi.fn()} onDecline={vi.fn()} />);
    expect(screen.getByText("A note on analytics")).toBeInTheDocument();
    expect(screen.getByText(/Mixpanel/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /privacy policy/i });
    expect(link).toHaveAttribute("href", "/privacy");
  });

  it("renders Accept and Decline buttons", () => {
    render(<ConsentBanner onAccept={vi.fn()} onDecline={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
  });

  it("invokes onAccept when Accept is clicked", async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    render(<ConsentBanner onAccept={onAccept} onDecline={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Accept" }));
    expect(onAccept).toHaveBeenCalledOnce();
  });

  it("invokes onDecline when Decline is clicked", async () => {
    const user = userEvent.setup();
    const onDecline = vi.fn();
    render(<ConsentBanner onAccept={vi.fn()} onDecline={onDecline} />);
    await user.click(screen.getByRole("button", { name: "Decline" }));
    expect(onDecline).toHaveBeenCalledOnce();
  });

  it("uses role=dialog with aria-labelledby for accessibility", () => {
    render(<ConsentBanner onAccept={vi.fn()} onDecline={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-labelledby", "consent-banner-title");
  });

  it("renders Sanity-provided content when supplied", () => {
    render(
      <ConsentBanner
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        content={{
          title: "Custom title",
          body: "Custom body text",
          privacyLinkText: "Privacy",
          acceptLabel: "Yes please",
          declineLabel: "No thanks",
        }}
      />,
    );
    expect(screen.getByText("Custom title")).toBeInTheDocument();
    expect(screen.getByText(/Custom body text/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes please" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No thanks" })).toBeInTheDocument();
  });

  it("falls back to defaults for any field the Sanity content omits", () => {
    render(
      <ConsentBanner
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        content={{ title: "Just a title" }}
      />,
    );
    expect(screen.getByText("Just a title")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
  });
});
