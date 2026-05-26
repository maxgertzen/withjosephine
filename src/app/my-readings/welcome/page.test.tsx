import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/sanity/fetch", () => ({
  fetchMyReadingsPage: vi.fn().mockResolvedValue(null),
}));

import { fetchMyReadingsPage } from "@/lib/sanity/fetch";

import MyReadingsWelcomePage from "./page";

describe("/my-readings/welcome page", () => {
  it("renders the interstitial when ?t=<token> is present", async () => {
    const element = await MyReadingsWelcomePage({
      searchParams: Promise.resolve({ t: "valid.token.value" }),
    });
    render(element);
    expect(screen.getByText("Welcome to your library.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue to your library/i })).toBeInTheDocument();
    const hidden = document.querySelector('input[name="t"]') as HTMLInputElement | null;
    expect(hidden).not.toBeNull();
    expect(hidden?.value).toBe("valid.token.value");
    const form = document.querySelector("form");
    expect(form?.getAttribute("action")).toBe("/api/library/redeem");
    expect(form?.getAttribute("method")).toBe("POST");
  });

  it("redirects to /my-readings when no token is present", async () => {
    await expect(
      MyReadingsWelcomePage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("NEXT_REDIRECT:/my-readings");
  });

  it("uses Sanity copy overrides when provided", async () => {
    vi.mocked(fetchMyReadingsPage).mockResolvedValueOnce({
      listHeading: "Your readings",
      listSubheading: "Sub",
      openButtonLabel: "Open",
      emptyHeading: "Empty",
      emptyCtaLabel: "Cta",
      expiredRowLabel: "Expired",
      expiredMailtoLabel: "Mail",
      expiredMailtoSubject: "Subject",
      signInHeading: "Sign",
      signInBody: "Body",
      signInButtonLabel: "Send",
      signInFootnote: "Note",
      checkEmailHeading: "Check",
      checkEmailBody: "Check body",
      checkEmailResendLabel: "Resend",
      welcomeHeading: "Custom welcome",
      welcomeSubhead: "Custom subhead",
      welcomeButtonLabel: "Custom button",
    });
    const element = await MyReadingsWelcomePage({
      searchParams: Promise.resolve({ t: "valid.token" }),
    });
    render(element);
    expect(screen.getByText("Custom welcome")).toBeInTheDocument();
    expect(screen.getByText("Custom subhead")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Custom button" })).toBeInTheDocument();
  });
});
