import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GIFT_DEFAULTS } from "@/data/defaults";
import { GIFT_NOTE_MAX_CHARS } from "@/lib/booking/constants";
import { GIFT_NOTE_API_ROUTE } from "@/lib/http/routes";

import { GiftNoteBlock } from "./GiftNoteBlock";

const NOTE = "Happy birthday, Anna.";

const fetchMock = vi.fn();

function renderBlock(text: string | null = NOTE) {
  return render(
    <GiftNoteBlock
      copy={GIFT_DEFAULTS}
      note={{ buyerFirstName: "Dana", text }}
      noteEdit={{ token: "send-token" }}
    />,
  );
}

async function openEditor(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: GIFT_DEFAULTS.editNoteLabel }));
}

function fromField() {
  return screen.getByLabelText(new RegExp(`^${GIFT_DEFAULTS.fromLabel}`));
}

function saveButton() {
  return screen.getByRole("button", { name: GIFT_DEFAULTS.saveNoteLabel });
}

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GiftNoteBlock editing", () => {
  it("opens the form with the saved values inside a masked form", async () => {
    const user = userEvent.setup();
    renderBlock();
    await openEditor(user);

    expect(fromField()).toHaveValue("Dana");
    expect(screen.getByLabelText(GIFT_DEFAULTS.noteLabel)).toHaveValue(NOTE);
    expect(saveButton().closest("form")).toHaveAttribute("data-clarity-mask", "True");
  });

  it("posts the GiftNoteRequest and shows the saved notice with the new values", async () => {
    const user = userEvent.setup();
    renderBlock();
    await openEditor(user);
    await user.clear(fromField());
    await user.type(fromField(), "Dee");
    await user.clear(screen.getByLabelText(GIFT_DEFAULTS.noteLabel));
    await user.type(screen.getByLabelText(GIFT_DEFAULTS.noteLabel), "See you soon");
    await user.click(saveButton());

    expect(fetchMock).toHaveBeenCalledWith(
      GIFT_NOTE_API_ROUTE,
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      token: "send-token",
      buyerFirstName: "Dee",
      note: "See you soon",
    });
    expect(await screen.findByText(GIFT_DEFAULTS.noteSavedNotice)).toBeVisible();
    expect(screen.getByText("Your note, from Dee")).toBeVisible();
    expect(screen.getByText("See you soon")).toBeVisible();
  });

  it("shows the locked notice on 409", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "not_active" }), { status: 409 }),
    );
    const user = userEvent.setup();
    renderBlock();
    await openEditor(user);
    await user.click(saveButton());

    expect(await screen.findByText(GIFT_DEFAULTS.noteLockedNotice)).toBeVisible();
    expect(
      screen.queryByRole("button", { name: GIFT_DEFAULTS.editNoteLabel }),
    ).not.toBeInTheDocument();
  });

  it.each([
    [
      "a server error",
      () => fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 })),
      GIFT_DEFAULTS.sheetSubmitFailed,
    ],
    [
      "a network error",
      () => fetchMock.mockRejectedValueOnce(new TypeError("offline")),
      GIFT_DEFAULTS.sheetNetworkFailed,
    ],
  ])("shows its line on %s and keeps the values", async (_label, arrange, message) => {
    arrange();
    const user = userEvent.setup();
    renderBlock();
    await openEditor(user);
    await user.click(saveButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByLabelText(GIFT_DEFAULTS.noteLabel)).toHaveValue(NOTE);
  });

  it("requires a name and posts nothing without one", async () => {
    const user = userEvent.setup();
    renderBlock();
    await openEditor(user);
    await user.clear(fromField());
    await user.click(saveButton());

    expect(screen.getByText(GIFT_DEFAULTS.buyerNameRequired)).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the form line and posts nothing when only the note fails validation", async () => {
    const user = userEvent.setup();
    renderBlock("a".repeat(GIFT_NOTE_MAX_CHARS + 1));
    await openEditor(user);
    await user.click(saveButton());

    expect(screen.getByRole("alert")).toHaveTextContent(GIFT_DEFAULTS.sheetSubmitFailed);
    expect(screen.queryByText(GIFT_DEFAULTS.buyerNameRequired)).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns to the saved card without saving on Not now", async () => {
    const user = userEvent.setup();
    renderBlock();
    await openEditor(user);
    await user.clear(screen.getByLabelText(GIFT_DEFAULTS.noteLabel));
    await user.type(screen.getByLabelText(GIFT_DEFAULTS.noteLabel), "Changed my mind");
    await user.click(screen.getByRole("button", { name: GIFT_DEFAULTS.sheetCancelLabel }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: GIFT_DEFAULTS.saveNoteLabel })).not.toBeInTheDocument();
    expect(screen.getByText(NOTE)).toBeVisible();
    expect(screen.queryByText("Changed my mind")).not.toBeInTheDocument();
    expect(screen.queryByText(GIFT_DEFAULTS.noteSavedNotice)).not.toBeInTheDocument();
  });

  it("shows the counter from 220 characters", async () => {
    const user = userEvent.setup();
    renderBlock("a".repeat(219));
    await openEditor(user);
    expect(screen.queryByText(/left$/)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(GIFT_DEFAULTS.noteLabel), "b");

    expect(screen.getByText("60 left")).toBeVisible();
  });
});

describe("GiftNoteBlock without a note", () => {
  it("shows Add a note, which opens an empty note field", async () => {
    const user = userEvent.setup();
    renderBlock(null);

    expect(
      screen.queryByRole("button", { name: GIFT_DEFAULTS.editNoteLabel }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: GIFT_DEFAULTS.addNoteLabel }));

    expect(screen.getByLabelText(GIFT_DEFAULTS.noteLabel)).toHaveValue("");
  });
});
