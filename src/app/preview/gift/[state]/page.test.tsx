import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sanity/fetch", () => ({
  fetchBookingForm: vi.fn(),
  fetchBookingPage: vi.fn(),
  fetchGiftSettings: vi.fn(),
  fetchLandingPage: vi.fn(),
  fetchNotesState: vi.fn().mockResolvedValue(null),
  fetchNotesStatePublished: vi.fn().mockResolvedValue(null),
  fetchReading: vi.fn(),
  fetchReadingNotes: vi.fn(),
  fetchReadings: vi.fn(),
  fetchSiteSettings: vi.fn(),
  fetchSiteSettingsPublished: vi.fn().mockResolvedValue(null),
  fetchThankYouPage: vi.fn(),
}));

const notFoundMock = vi.fn(() => {
  throw new Error("__notfound__");
});

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  usePathname: () => "/preview/gift",
}));

const intakeFormMock = vi.fn<(props: Record<string, unknown>) => null>(() => null);

vi.mock("@/components/IntakeForm", () => ({
  IntakeForm: (props: Record<string, unknown>) => intakeFormMock(props),
}));

import { GIFT_DEFAULTS, PAYMENT_BUTTON_TEXT_FALLBACK } from "@/data/defaults";
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
  fetchSiteSettings,
  fetchThankYouPage,
} from "@/lib/sanity/fetch";

const EXPECTED_TEXT: Record<GiftPreviewState, string> = {
  "buy-sheet": GIFT_DEFAULTS.sheetEyebrow,
  "buyer-thank-you": PREVIEW_GIFT.code,
  "redeem-sheet": GIFT_DEFAULTS.redeemHeading,
  opened: GIFT_DEFAULTS.priceLine,
  "opened-no-note": GIFT_DEFAULTS.priceLine,
  "already-opened": GIFT_DEFAULTS.alreadyOpenedHeading,
  "no-longer-active": GIFT_DEFAULTS.noLongerActiveHeading,
  "not-found": GIFT_DEFAULTS.notFoundHeading,
  "last-page": GIFT_DEFAULTS.priceLine,
  "recipient-thank-you": "Thank you, Anna. Your reading is in my hands now.",
  "send-link": GIFT_DEFAULTS.sendHeading,
};

beforeEach(() => {
  vi.mocked(fetchBookingForm).mockResolvedValue({
    nonRefundableNotice: "Non-refundable.",
    sections: [],
  });
  vi.mocked(fetchReadings).mockResolvedValue([]);
  vi.mocked(fetchReadingNotes).mockResolvedValue([]);
  vi.mocked(fetchGiftSettings).mockResolvedValue(null);
  vi.mocked(fetchThankYouPage).mockResolvedValue(null);
  vi.mocked(fetchSiteSettings).mockResolvedValue(null);
  notFoundMock.mockClear();
  intakeFormMock.mockClear();
});

async function renderPreview(state: string) {
  const Page = (await import("./page")).default;
  return render(await Page({ params: Promise.resolve({ state }) }));
}

describe("/preview/gift/[state]", () => {
  it.each(GIFT_PREVIEW_STATES)("renders $state", async ({ state }) => {
    await renderPreview(state);

    expect(await screen.findByText(EXPECTED_TEXT[state])).toBeTruthy();
  });

  it("buy-sheet opens the gift sheet for the Birth Chart reading", async () => {
    const birthChart = getReadingById(PREVIEW_GIFT.readingSlug);

    await renderPreview("buy-sheet");

    expect(
      await screen.findByRole("dialog", { name: `${birthChart?.name} · ${birthChart?.price}` }),
    ).toBeTruthy();
  });

  it("buy-sheet shows Gift Settings copy over the defaults", async () => {
    vi.mocked(fetchGiftSettings).mockResolvedValue({ sheetEyebrow: "Given with love." });

    await renderPreview("buy-sheet");

    expect(screen.getByText("Given with love.")).toBeTruthy();
  });

  it.each(["buy-sheet", "redeem-sheet"] as const)(
    "%s shows the gift row open behind the sheet",
    async (state) => {
      await renderPreview(state);

      expect(screen.getByTestId("gift-fold")).toBeTruthy();
      expect(
        screen
          .getByRole("button", { name: GIFT_DEFAULTS.giftRowLabel })
          .getAttribute("aria-expanded"),
      ).toBe("true");
      expect(screen.getByText(GIFT_DEFAULTS.buyLead)).toBeTruthy();
    },
  );

  it.each(["opened", "last-page"] as const)("%s renders no gift row", async (state) => {
    await renderPreview(state);

    expect(screen.queryByTestId("gift-fold")).toBeNull();
  });

  it("buy-sheet posts nothing on a filled gift sheet", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    await renderPreview("buy-sheet");

    const sheet = await screen.findByRole("dialog");
    await user.type(within(sheet).getByLabelText(new RegExp(GIFT_DEFAULTS.buyerNameLabel)), "Dana");
    await user.click(within(sheet).getByRole("checkbox"));
    await user.click(within(sheet).getByRole("button", { name: PAYMENT_BUTTON_TEXT_FALLBACK }));

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
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

  it("redeem-sheet opens the redeem sheet and posts nothing on Redeem", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    await renderPreview("redeem-sheet");

    const sheet = await screen.findByRole("dialog", { name: GIFT_DEFAULTS.redeemHeading });
    await user.type(within(sheet).getByLabelText(GIFT_DEFAULTS.codeFieldLabel), "K7M2 QX9P H4TR");
    await user.click(within(sheet).getByRole("button", { name: GIFT_DEFAULTS.redeemButtonLabel }));

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("send-link shows the send form from Dana with sending disabled and posts nothing", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await renderPreview("send-link");

    expect(
      screen.getByText(
        `From ${PREVIEW_GIFT.buyerFirstName}, with your note. Sent now, from hello@withjosephine.com.`,
      ),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: GIFT_DEFAULTS.sendButtonLabel })).toHaveProperty(
      "disabled",
      true,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("recipient-thank-you shows the gift card label and no price", async () => {
    await renderPreview("recipient-thank-you");

    expect(screen.getByText(`Your gift, from ${PREVIEW_GIFT.buyerFirstName}`)).toBeTruthy();
    expect(screen.queryByText("$89")).toBeNull();
  });

  it.each(["opened", "last-page"] as const)(
    "%s shows the note from Dana, the gift page line and no other readings",
    async (state) => {
      await renderPreview(state);

      expect(screen.getByText(PREVIEW_GIFT.note)).toBeTruthy();
      expect(screen.getByText(`A note from ${PREVIEW_GIFT.buyerFirstName}`)).toBeTruthy();
      expect(intakeFormMock).toHaveBeenCalledWith(
        expect.objectContaining({
          gift: expect.objectContaining({
            overrides: expect.objectContaining({
              pageIndicatorTagline: expect.stringContaining(
                `a gift from ${PREVIEW_GIFT.buyerFirstName}`,
              ),
            }),
          }),
        }),
      );
    },
  );

  it("opened-no-note shows the note card without a note", async () => {
    await renderPreview("opened-no-note");

    expect(screen.getByText(GIFT_DEFAULTS.noteCardFoot)).toBeTruthy();
    expect(screen.queryByText(PREVIEW_GIFT.note)).toBeNull();
  });

  it("last-page opens the form on its final page, and opened does not", async () => {
    await renderPreview("last-page");
    expect(intakeFormMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ initialPage: "last" }),
    );

    intakeFormMock.mockClear();
    await renderPreview("opened");
    expect(intakeFormMock).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ initialPage: "last" }),
    );
  });

  it.each(["opened", "opened-no-note", "last-page"] as const)(
    "%s renders the form in preview mode",
    async (state) => {
      await renderPreview(state);

      expect(intakeFormMock).toHaveBeenLastCalledWith(expect.objectContaining({ preview: true }));
    },
  );

  it("the gift form previews use a code that can never redeem", async () => {
    await renderPreview("opened");

    const gift = intakeFormMock.mock.lastCall?.[0].gift as { code: string };
    expect(normalizeGiftCode(gift.code)).toBeNull();
  });

  it.each(["already-opened", "no-longer-active"] as const)(
    "%s offers to book the reading",
    async (state) => {
      const readingName = getReadingById(PREVIEW_GIFT.readingSlug)?.name;
      await renderPreview(state);

      expect(screen.getByText(`Book the ${readingName} yourself`)).toBeTruthy();
    },
  );

  it("not-found shows no reading and no booking button", async () => {
    await renderPreview("not-found");

    expect(screen.queryByText(/yourself$/)).toBeNull();
  });

  it("an unknown state calls notFound", async () => {
    await expect(renderPreview("gift-card")).rejects.toThrow("__notfound__");
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("the sample code is not a valid gift code", () => {
    expect(normalizeGiftCode(PREVIEW_GIFT.code)).toBeNull();
  });
});
