import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GIFT_DEFAULTS } from "@/data/defaults";
import type { GiftSendStatus } from "@/lib/gift/giftSendContract";
import { respond } from "@/test/respond";

import { GiftSendPageView } from "./GiftSendPageView";

vi.mock("@/components/StarField", () => ({
  StarField: () => null,
}));
vi.mock("@/components/CelestialOrb", () => ({
  CelestialOrb: () => null,
}));
vi.mock("@/components/Footer", () => ({
  Footer: () => null,
}));

const TOKEN = "gift-id.mac";
const READY: GiftSendStatus = {
  state: "ready",
  buyerName: "Dana",
  hasNote: true,
  recipientName: null,
};

function renderPage(status: GiftSendStatus | null, disabled?: boolean) {
  return render(
    <GiftSendPageView copy={GIFT_DEFAULTS} status={status} token={TOKEN} disabled={disabled} />,
  );
}

function headingTexts() {
  return screen.getAllByRole("heading").map((heading) => heading.textContent);
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_BOOKING_TURNSTILE_BYPASS", "");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("GiftSendPageView loading", () => {
  it("shows an empty card until the status arrives", () => {
    const { container } = renderPage(null);

    expect(container.querySelector("[aria-busy='true']")).toBeEmptyDOMElement();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });
});

describe("GiftSendPageView heading", () => {
  it("ready without a saved recipient name shows the send heading once", () => {
    renderPage(READY);

    expect(headingTexts()).toEqual([GIFT_DEFAULTS.sendHeading]);
  });

  it("ready with a saved recipient name shows one heading, and none of it after a send", async () => {
    const user = userEvent.setup();
    renderPage({ ...READY, recipientName: "Anna" });

    expect(headingTexts()).toEqual(["Send Anna’s gift"]);

    respond(200, { state: "sent", recipientName: "Anna", lastSentAt: "2026-10-04T10:00:00.000Z" });
    await user.type(screen.getByLabelText(/Their name/), "Anna");
    await user.type(screen.getByLabelText(/Their email/), "anna@email.com");
    await user.click(screen.getByRole("button", { name: GIFT_DEFAULTS.sendButtonLabel }));

    await screen.findByRole("heading", { name: "Sent to Anna" });
    expect(headingTexts()).toEqual(["Sent to Anna"]);
  });
});

describe("GiftSendPageView preview", () => {
  it("renders the given status with sending disabled and posts nothing", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    renderPage(READY, true);

    expect(screen.getByRole("button", { name: GIFT_DEFAULTS.sendButtonLabel })).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
