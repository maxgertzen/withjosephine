import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sanity/fetch", () => ({
  fetchBookingForm: vi.fn(),
  fetchBookingPage: vi.fn(),
  fetchGiftSettings: vi.fn(),
  fetchLandingPage: vi.fn(),
  fetchNotesState: vi.fn(),
  fetchReading: vi.fn(),
  fetchReadingNotes: vi.fn(),
  fetchReadings: vi.fn(),
}));

const notFoundMock = vi.fn(() => {
  throw new Error("__notfound__");
});

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  usePathname: () => "/preview/gift",
}));

vi.mock("@/components/IntakeForm", () => ({
  IntakeForm: () => null,
}));

import { GIFT_DEFAULTS } from "@/data/defaults";
import { getReadingById } from "@/data/readings";
import { PREVIEW_GIFT } from "@/lib/emails/preview-fixtures";
import { normalizeGiftCode } from "@/lib/gift/giftCodeFormat";
import {
  GIFT_PREVIEW_STATES,
  type GiftPreviewState,
} from "@/lib/page-previews/preview-fixtures-pages";
import {
  fetchBookingForm,
  fetchGiftSettings,
  fetchReadingNotes,
  fetchReadings,
} from "@/lib/sanity/fetch";

const EXPECTED_TEXT: Record<GiftPreviewState, string> = {
  "buy-sheet": GIFT_DEFAULTS.sheetEyebrow,
  "buyer-thank-you": PREVIEW_GIFT.code,
};

beforeEach(() => {
  vi.mocked(fetchBookingForm).mockResolvedValue({ nonRefundableNotice: "Non-refundable.", sections: [] });
  vi.mocked(fetchReadings).mockResolvedValue([]);
  vi.mocked(fetchReadingNotes).mockResolvedValue([]);
  vi.mocked(fetchGiftSettings).mockResolvedValue(null);
  notFoundMock.mockClear();
});

async function renderPreview(state: string) {
  const Page = (await import("./page")).default;
  return render(await Page({ params: Promise.resolve({ state }) }));
}

describe("/preview/gift/[state]", () => {
  it.each(GIFT_PREVIEW_STATES)("renders $state", async ({ state }) => {
    await renderPreview(state);

    expect(screen.getByText(EXPECTED_TEXT[state])).toBeTruthy();
  });

  it("buy-sheet opens the gift sheet for the Birth Chart reading", async () => {
    const birthChart = getReadingById(PREVIEW_GIFT.readingSlug);

    await renderPreview("buy-sheet");

    expect(
      screen.getByRole("dialog", { name: `${birthChart?.name} · ${birthChart?.price}` }),
    ).toBeTruthy();
  });

  it("buy-sheet shows Gift Settings copy over the defaults", async () => {
    vi.mocked(fetchGiftSettings).mockResolvedValue({ sheetEyebrow: "Given with love." });

    await renderPreview("buy-sheet");

    expect(screen.getByText("Given with love.")).toBeTruthy();
  });

  it("buyer-thank-you shows the sample note from Dana with Save note disabled", async () => {
    const user = userEvent.setup();
    await renderPreview("buyer-thank-you");

    expect(screen.getByText(PREVIEW_GIFT.note)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: GIFT_DEFAULTS.editNoteLabel }));

    expect(screen.getByRole("button", { name: GIFT_DEFAULTS.saveNoteLabel })).toHaveProperty(
      "disabled",
      true,
    );
  });

  it("an unknown state calls notFound", async () => {
    await expect(renderPreview("gift-card")).rejects.toThrow("__notfound__");
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("the sample code is not a valid gift code", () => {
    expect(normalizeGiftCode(PREVIEW_GIFT.code)).toBeNull();
  });
});
