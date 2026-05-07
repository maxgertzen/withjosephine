import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/analytics", () => ({
  initAnalytics: vi.fn(),
}));

vi.mock("@/lib/clarity-consent", () => ({
  clarityConsent: vi.fn(),
}));

import { initAnalytics } from "@/lib/analytics";
import { clarityConsent } from "@/lib/clarity-consent";

import { AnalyticsBootstrap } from "./AnalyticsBootstrap";

const STORAGE_KEY = "josephine.consent";

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("AnalyticsBootstrap", () => {
  describe("consentRequired = false (rest of world)", () => {
    it("calls initAnalytics on mount and renders no banner", async () => {
      await act(async () => {
        render(<AnalyticsBootstrap consentRequired={false} />);
      });
      expect(initAnalytics).toHaveBeenCalledOnce();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("consentRequired = true with prior choice", () => {
    it("inits when prior choice is 'granted'", async () => {
      window.localStorage.setItem(STORAGE_KEY, "granted");
      await act(async () => {
        render(<AnalyticsBootstrap consentRequired={true} />);
      });
      expect(initAnalytics).toHaveBeenCalledOnce();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("does NOT init when prior choice is 'declined' and renders no banner", async () => {
      window.localStorage.setItem(STORAGE_KEY, "declined");
      await act(async () => {
        render(<AnalyticsBootstrap consentRequired={true} />);
      });
      expect(initAnalytics).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("consentRequired = true with no prior choice", () => {
    it("renders the consent banner without initing analytics", async () => {
      await act(async () => {
        render(<AnalyticsBootstrap consentRequired={true} />);
      });
      expect(initAnalytics).not.toHaveBeenCalled();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument();
    });

    it("Accept click writes 'granted', inits analytics, dismisses banner", async () => {
      const user = userEvent.setup();
      await act(async () => {
        render(<AnalyticsBootstrap consentRequired={true} />);
      });
      await user.click(screen.getByRole("button", { name: "Accept" }));
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe("granted");
      expect(initAnalytics).toHaveBeenCalledOnce();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("Decline click writes 'declined', does NOT init, dismisses banner", async () => {
      const user = userEvent.setup();
      await act(async () => {
        render(<AnalyticsBootstrap consentRequired={true} />);
      });
      await user.click(screen.getByRole("button", { name: "Decline" }));
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe("declined");
      expect(initAnalytics).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("Clarity Consent API v2", () => {
    it("calls clarityConsent(true) on the no-banner-needed path", async () => {
      await act(async () => {
        render(<AnalyticsBootstrap consentRequired={false} />);
      });
      expect(clarityConsent).toHaveBeenCalledWith(true);
    });

    it("calls clarityConsent(true) when accepting the banner", async () => {
      const user = userEvent.setup();
      await act(async () => {
        render(<AnalyticsBootstrap consentRequired={true} />);
      });
      await user.click(screen.getByRole("button", { name: "Accept" }));
      expect(clarityConsent).toHaveBeenCalledWith(true);
    });

    it("does NOT call clarityConsent when declining the banner", async () => {
      const user = userEvent.setup();
      await act(async () => {
        render(<AnalyticsBootstrap consentRequired={true} />);
      });
      await user.click(screen.getByRole("button", { name: "Decline" }));
      expect(clarityConsent).not.toHaveBeenCalled();
    });

    it("calls clarityConsent(true) when prior consent was 'granted'", async () => {
      window.localStorage.setItem(STORAGE_KEY, "granted");
      await act(async () => {
        render(<AnalyticsBootstrap consentRequired={true} />);
      });
      expect(clarityConsent).toHaveBeenCalledWith(true);
    });
  });
});
