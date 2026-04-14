import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Footer } from "./Footer";
import type { MappedSocialLink } from "@/lib/sanity/mappers";

describe("Footer", () => {
  it("renders hardcoded defaults when no content is provided", () => {
    render(<Footer />);

    expect(screen.getByText(/Josephine\. All rights reserved\./)).toBeInTheDocument();
    expect(screen.getByAltText("Josephine")).toBeInTheDocument();
  });

  it("renders Sanity content when provided", () => {
    const content = {
      brandName: "Custom Brand",
      logoUrl: "/images/custom-logo.png",
      copyrightText: "Custom Brand Inc.",
    };

    render(<Footer content={content} />);

    expect(screen.getByText(/Custom Brand Inc\./)).toBeInTheDocument();
    expect(screen.getByAltText("Custom Brand")).toBeInTheDocument();
  });

  it("hides logo when logoUrl is not provided", () => {
    const content = {
      brandName: "No Logo Brand",
      copyrightText: "No Logo Brand.",
    };

    render(<Footer content={content} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText(/No Logo Brand\./)).toBeInTheDocument();
  });

  it("includes current year in copyright", () => {
    render(<Footer />);

    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });

  it("renders no social links when none provided", () => {
    render(<Footer />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders social links with correct hrefs and labels", () => {
    const socialLinks: MappedSocialLink[] = [
      { platform: "tiktok", url: "https://tiktok.com/@test", label: "TikTok" },
      { platform: "instagram", url: "https://instagram.com/test", label: "Instagram" },
    ];

    render(<Footer socialLinks={socialLinks} />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);

    const tiktokLink = screen.getByLabelText("TikTok");
    expect(tiktokLink).toHaveAttribute("href", "https://tiktok.com/@test");
    expect(tiktokLink).toHaveAttribute("target", "_blank");
    expect(tiktokLink).toHaveAttribute("rel", "noopener noreferrer");

    const instagramLink = screen.getByLabelText("Instagram");
    expect(instagramLink).toHaveAttribute("href", "https://instagram.com/test");
  });

  it("renders email link without target blank", () => {
    const socialLinks: MappedSocialLink[] = [
      { platform: "email", url: "mailto:jo@example.com", label: "Email" },
    ];

    render(<Footer socialLinks={socialLinks} />);

    const emailLink = screen.getByLabelText("Email");
    expect(emailLink).toHaveAttribute("href", "mailto:jo@example.com");
    expect(emailLink).not.toHaveAttribute("target");
  });
});
