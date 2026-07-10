import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/analytics", () => ({
  initAnalytics: vi.fn(),
}));

// Clarity init + consent now live inside ClarityScript's effect; stub it out so
// these tests stay focused on the consent-banner / initAnalytics orchestration.
vi.mock("@/components/ClarityScript", () => ({
  ClarityScript: () => null,
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

import { usePathname } from "next/navigation";

import { initAnalytics } from "@/lib/analytics";

import { AnalyticsBootstrap } from "./AnalyticsBootstrap";

const STORAGE_KEY = "josephine.consent";
const mockUsePathname = vi.mocked(usePathname);

function setConsentRequired(required: boolean) {
  document.cookie = `consent-required=${required ? "1" : "0"}; path=/`;
}

function clearConsentCookie() {
  document.cookie = "consent-required=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

beforeEach(() => {
  window.localStorage.clear();
  clearConsentCookie();
  mockUsePathname.mockReturnValue("/");
  vi.clearAllMocks();
});

afterEach(() => {
  window.localStorage.clear();
  clearConsentCookie();
});

describe("AnalyticsBootstrap", () => {
  describe("consent not required (rest of world)", () => {
    it("calls initAnalytics on mount and renders no banner", async () => {
      setConsentRequired(false);
      await act(async () => {
        render(<AnalyticsBootstrap />);
      });
      expect(initAnalytics).toHaveBeenCalledOnce();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("consent required with prior choice", () => {
    it("inits when prior choice is 'granted'", async () => {
      setConsentRequired(true);
      window.localStorage.setItem(STORAGE_KEY, "granted");
      await act(async () => {
        render(<AnalyticsBootstrap />);
      });
      expect(initAnalytics).toHaveBeenCalledOnce();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("does NOT init when prior choice is 'declined' and renders no banner", async () => {
      setConsentRequired(true);
      window.localStorage.setItem(STORAGE_KEY, "declined");
      await act(async () => {
        render(<AnalyticsBootstrap />);
      });
      expect(initAnalytics).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("consent required with no prior choice", () => {
    it("renders the consent banner without initing analytics", async () => {
      setConsentRequired(true);
      await act(async () => {
        render(<AnalyticsBootstrap />);
      });
      expect(initAnalytics).not.toHaveBeenCalled();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
    });

    it("Accept click writes 'granted', inits analytics, dismisses banner", async () => {
      setConsentRequired(true);
      const user = userEvent.setup();
      await act(async () => {
        render(<AnalyticsBootstrap />);
      });
      await user.click(screen.getByRole("button", { name: "Accept" }));
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe("granted");
      expect(initAnalytics).toHaveBeenCalledOnce();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("Decline click writes 'declined', does NOT init, dismisses banner", async () => {
      setConsentRequired(true);
      const user = userEvent.setup();
      await act(async () => {
        render(<AnalyticsBootstrap />);
      });
      await user.click(screen.getByRole("button", { name: "Decline" }));
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe("declined");
      expect(initAnalytics).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("preview mode (Studio Presentation iframe)", () => {
    it("renders the banner by default in preview so editors can edit copy", async () => {
      mockUsePathname.mockReturnValue("/preview");
      await act(async () => {
        render(<AnalyticsBootstrap />);
      });
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("hides the banner in preview when consentBanner.hideInPreview is true", async () => {
      mockUsePathname.mockReturnValue("/preview");
      await act(async () => {
        render(<AnalyticsBootstrap consentBannerContent={{ hideInPreview: true }} />);
      });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
