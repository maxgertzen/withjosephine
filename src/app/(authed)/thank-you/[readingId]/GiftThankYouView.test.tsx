import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GIFT_DEFAULTS } from "@/data/defaults";
import { PREVIEW_GIFT } from "@/lib/emails/preview-fixtures";
import { ACTIVE_GIFT, giftThankYouViewProps, SHOWN_GIFT } from "@/test/fixtures/giftThankYou";

import type { GiftThankYouSource } from "./deriveGiftThankYouViewProps";
import { GiftThankYouView } from "./GiftThankYouView";

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

function renderView(gift: GiftThankYouSource) {
  return render(<GiftThankYouView {...giftThankYouViewProps(gift)} />);
}

function setNavigator(key: "share" | "clipboard", value: unknown) {
  Object.defineProperty(navigator, key, { value, configurable: true, writable: true });
}

function setExecCommand(value: unknown) {
  Object.defineProperty(document, "execCommand", { value, configurable: true, writable: true });
}

beforeEach(() => {
  setNavigator("share", undefined);
});

describe("GiftThankYouView active", () => {
  it("shows the heading with the buyer name and a masked code", () => {
    renderView(ACTIVE_GIFT);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Thank you, Dana. Your gift is ready.",
    );
    expect(screen.getByTestId("gift-code")).toHaveTextContent(SHOWN_GIFT.displayCode);
    expect(screen.getByTestId("gift-code")).toHaveAttribute("data-clarity-mask", "True");
  });

  it("copies the gift URL and keeps the copied label", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    setNavigator("clipboard", { writeText });
    renderView(ACTIVE_GIFT);

    await user.click(screen.getByRole("button", { name: GIFT_DEFAULTS.copyLinkLabel }));
    await user.click(screen.getByRole("button", { name: GIFT_DEFAULTS.linkCopiedLabel }));

    expect(writeText).toHaveBeenCalledWith(SHOWN_GIFT.giftUrl);
    expect(screen.getByRole("button", { name: GIFT_DEFAULTS.linkCopiedLabel })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: GIFT_DEFAULTS.copyLinkLabel }),
    ).not.toBeInTheDocument();
  });

  it("copies through a text selection when the clipboard API is missing", async () => {
    const execCommand = vi.fn().mockReturnValue(true);
    const user = userEvent.setup();
    setExecCommand(execCommand);
    setNavigator("clipboard", undefined);
    renderView(ACTIVE_GIFT);

    await user.click(screen.getByRole("button", { name: GIFT_DEFAULTS.copyLinkLabel }));

    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(screen.getByRole("button", { name: GIFT_DEFAULTS.linkCopiedLabel })).toBeVisible();
    expect(screen.queryByRole("textbox", { name: GIFT_DEFAULTS.copyLinkLabel })).toBeNull();
  });

  it.each([
    ["returns false", () => vi.fn().mockReturnValue(false)],
    [
      "throws",
      () =>
        vi.fn(() => {
          throw new Error("unsupported");
        }),
    ],
  ])(
    "shows the link in a masked field, selected on focus, when the clipboard rejects and the selection copy %s",
    async (_label, execCommand) => {
      const user = userEvent.setup();
      setExecCommand(execCommand());
      setNavigator("clipboard", { writeText: vi.fn().mockRejectedValue(new Error("denied")) });
      renderView(ACTIVE_GIFT);

      await user.click(screen.getByRole("button", { name: GIFT_DEFAULTS.copyLinkLabel }));
      const linkField = screen.getByRole("textbox", { name: GIFT_DEFAULTS.copyLinkLabel });
      await user.click(linkField);

      expect(screen.getByRole("button", { name: GIFT_DEFAULTS.copyLinkLabel })).toBeVisible();
      expect(linkField).toHaveValue(SHOWN_GIFT.giftUrl);
      expect(linkField).toHaveAttribute("readonly");
      expect(linkField).toHaveAttribute("data-clarity-mask", "True");
      expect(linkField).toHaveProperty("selectionStart", 0);
      expect(linkField).toHaveProperty("selectionEnd", SHOWN_GIFT.giftUrl.length);
    },
  );

  it("renders no Share button without navigator.share", () => {
    renderView(ACTIVE_GIFT);
    expect(
      screen.queryByRole("button", { name: GIFT_DEFAULTS.shareLabel }),
    ).not.toBeInTheDocument();
  });

  it("shares the text and URL when navigator.share exists", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setNavigator("share", share);
    const user = userEvent.setup();
    renderView(ACTIVE_GIFT);

    await user.click(screen.getByRole("button", { name: GIFT_DEFAULTS.shareLabel }));

    expect(share).toHaveBeenCalledWith({
      text: "A reading for you, from Dana ✨",
      url: SHOWN_GIFT.giftUrl,
    });
  });

  it.each(["AbortError", "NotAllowedError"])("ignores a share rejected with %s", async (name) => {
    const share = vi.fn().mockRejectedValue(new DOMException("rejected", name));
    setNavigator("share", share);
    const user = userEvent.setup();
    renderView(ACTIVE_GIFT);

    await user.click(screen.getByRole("button", { name: GIFT_DEFAULTS.shareLabel }));

    expect(share).toHaveBeenCalledTimes(1);
  });

  it("shows the saved note with Edit note", () => {
    renderView(ACTIVE_GIFT);
    expect(screen.getByText(PREVIEW_GIFT.note)).toHaveAttribute("data-clarity-mask", "True");
    expect(screen.getByRole("button", { name: GIFT_DEFAULTS.editNoteLabel })).toBeVisible();
  });

  it("opens the send form in place from the send button", async () => {
    const user = userEvent.setup();
    renderView(ACTIVE_GIFT);

    expect(screen.queryByLabelText(GIFT_DEFAULTS.recipientEmailLabel)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: GIFT_DEFAULTS.sendOpenLabel }));

    expect(screen.getByRole("heading", { name: GIFT_DEFAULTS.sendHeading })).toBeVisible();
    expect(screen.getByLabelText(/Their email/)).toHaveValue("");
    expect(
      screen.queryByRole("button", { name: GIFT_DEFAULTS.sendOpenLabel }),
    ).not.toBeInTheDocument();
  });

  it("opens on the already sent card after one send", async () => {
    const user = userEvent.setup();
    renderView({
      ...ACTIVE_GIFT,
      sendStatus: {
        ...ACTIVE_GIFT.sendStatus,
        state: "sent",
        recipientName: "Anna",
        lastSentAt: "2026-10-03T09:00:00.000Z",
      },
    });

    await user.click(screen.getByRole("button", { name: GIFT_DEFAULTS.sendOpenLabel }));

    expect(screen.getByRole("heading", { name: GIFT_DEFAULTS.alreadySentHeading })).toBeVisible();
    expect(screen.getByText("Sent to Anna on 3 October 2026.")).toBeVisible();
  });

  describe("after a note is saved", () => {
    const giftWithoutNote = {
      ...ACTIVE_GIFT,
      note: null,
      sendStatus: { ...ACTIVE_GIFT.sendStatus, hasNote: false },
    };

    beforeEach(() => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    async function addNote(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole("button", { name: GIFT_DEFAULTS.addNoteLabel }));
      const fromField = screen.getByLabelText(new RegExp(`^${GIFT_DEFAULTS.fromLabel}`));
      await user.clear(fromField);
      await user.type(fromField, "Dee");
      await user.type(screen.getByLabelText(GIFT_DEFAULTS.noteLabel), "See you soon");
      await user.click(screen.getByRole("button", { name: GIFT_DEFAULTS.saveNoteLabel }));
      await screen.findByText(GIFT_DEFAULTS.noteSavedNotice);
    }

    it("opens the send form with the saved name and the with-note help line", async () => {
      const user = userEvent.setup();
      renderView(giftWithoutNote);

      await addNote(user);
      await user.click(screen.getByRole("button", { name: GIFT_DEFAULTS.sendOpenLabel }));

      expect(
        screen.getByText("From Dee, with your note. Sent now, from hello@withjosephine.com."),
      ).toBeVisible();
    });

    it("updates the help line of a send form that is already open", async () => {
      const user = userEvent.setup();
      renderView(giftWithoutNote);
      await user.click(screen.getByRole("button", { name: GIFT_DEFAULTS.sendOpenLabel }));
      expect(screen.getByText("From Dana. Sent now, from hello@withjosephine.com.")).toBeVisible();

      await addNote(user);

      expect(
        screen.getByText("From Dee, with your note. Sent now, from hello@withjosephine.com."),
      ).toBeVisible();
    });
  });

  it("renders no send button without a send token", () => {
    renderView({ ...ACTIVE_GIFT, sendToken: null });
    expect(
      screen.queryByRole("button", { name: GIFT_DEFAULTS.sendOpenLabel }),
    ).not.toBeInTheDocument();
  });

  it("disables Save note when there is no note token", async () => {
    const user = userEvent.setup();
    renderView({ ...ACTIVE_GIFT, sendToken: null });

    await user.click(screen.getByRole("button", { name: GIFT_DEFAULTS.editNoteLabel }));

    expect(screen.getByRole("button", { name: GIFT_DEFAULTS.saveNoteLabel })).toBeDisabled();
  });
});

describe("GiftThankYouView pending payment", () => {
  it("shows the bank line and no code", () => {
    renderView({ kind: "not_paid", buyerFirstName: "Dana" });
    expect(
      screen.queryByRole("button", { name: GIFT_DEFAULTS.sendOpenLabel }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Thank you, Dana.");
    expect(screen.getByText(GIFT_DEFAULTS.pendingBody)).toBeVisible();
    expect(screen.queryByTestId("gift-code")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: GIFT_DEFAULTS.copyLinkLabel }),
    ).not.toBeInTheDocument();
  });
});

describe("GiftThankYouView redeemed", () => {
  it("shows the code and the opened line without Edit note", () => {
    renderView({ kind: "redeemed", ...SHOWN_GIFT });
    expect(screen.getByTestId("gift-code")).toHaveTextContent(SHOWN_GIFT.displayCode);
    expect(screen.getByText(GIFT_DEFAULTS.thankYouOpenedNotice)).toBeVisible();
    expect(
      screen.queryByRole("button", { name: GIFT_DEFAULTS.editNoteLabel }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: GIFT_DEFAULTS.addNoteLabel }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: GIFT_DEFAULTS.sendOpenLabel }),
    ).not.toBeInTheDocument();
  });
});
