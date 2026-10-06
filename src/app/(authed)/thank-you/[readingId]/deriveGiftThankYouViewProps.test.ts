import { describe, expect, it } from "vitest";

import { GIFT_DEFAULTS } from "@/data/defaults";
import {
  ACTIVE_GIFT,
  giftThankYouViewProps as derive,
  SHOWN_GIFT,
} from "@/test/fixtures/giftThankYou";

describe("deriveGiftThankYouViewProps copy", () => {
  it("fills {buyerName} and {reading} in the defaults", () => {
    const props = derive(ACTIVE_GIFT);
    expect(props.copy.heading).toBe("Thank you, Dana. Your gift is ready.");
    expect(props.copy.subheading).toBe(GIFT_DEFAULTS.thankYouSubheading);
    expect(props.copy.codeHelp).toBe("For the Birth Chart Reading. It does not expire.");
    expect(props).toMatchObject({ shareText: "A reading for you, from Dana ✨" });
  });

  it("uses a Sanity value over the default", () => {
    const props = derive(ACTIVE_GIFT, {
      thankYouHeadingTemplate: "{buyerName}, it is ready.",
      copyLinkLabel: "Copy the link",
      noteSavedNotice: "Saved.",
    });
    expect(props.copy.heading).toBe("Dana, it is ready.");
    expect(props.copy.copyLinkLabel).toBe("Copy the link");
    expect(props.copy.note.noteSavedNotice).toBe("Saved.");
  });

  it("falls back to the default for a blank Sanity value", () => {
    const props = derive(ACTIVE_GIFT, { thankYouHeadingTemplate: "  ", shareLabel: "" });
    expect(props.copy.heading).toBe("Thank you, Dana. Your gift is ready.");
    expect(props.copy.shareLabel).toBe(GIFT_DEFAULTS.shareLabel);
  });

  it("falls back to every default when Sanity returns nothing", () => {
    const { note, ...rest } = derive(ACTIVE_GIFT).copy;
    expect(rest.linkCopiedLabel).toBe(GIFT_DEFAULTS.linkCopiedLabel);
    expect(note.savedNoteLabelTemplate).toBe(GIFT_DEFAULTS.savedNoteLabelTemplate);
    expect(note.noteCounterTemplate).toBe(GIFT_DEFAULTS.noteCounterTemplate);
  });

  it("passes only the strings the view, its note block and its send block render", () => {
    const { note, send, ...viewCopy } = derive(ACTIVE_GIFT).copy;
    expect(Object.keys(viewCopy).sort()).toEqual(
      [
        "heading",
        "subheading",
        "codeCardLabel",
        "copyLinkLabel",
        "linkCopiedLabel",
        "shareLabel",
        "codeHelp",
        "thankYouOpenedNotice",
        "pendingBody",
      ].sort(),
    );
    expect(Object.keys(note).sort()).toEqual(
      [
        "savedNoteLabelTemplate",
        "editNoteLabel",
        "noteFootnote",
        "addNoteLabel",
        "editNoteHeading",
        "fromLabel",
        "noteLabel",
        "buyerNameRequired",
        "noteCounterTemplate",
        "saveNoteLabel",
        "noteSavedNotice",
        "noteLockedNotice",
        "sheetSubmitFailed",
        "sheetNetworkFailed",
        "sheetCancelLabel",
      ].sort(),
    );
    expect(Object.keys(send).sort()).toEqual(
      [
        "sendOpenLabel",
        "sendHeading",
        "recipientNameLabel",
        "recipientEmailLabel",
        "recipientEmailInvalid",
        "recipientEmailIsBuyer",
        "sendHelpTemplate",
        "sendHelpNoNoteTemplate",
        "sendButtonLabel",
        "sendingLabel",
        "sentHeadingTemplate",
        "sentBodyTemplate",
        "resendLinkTemplate",
        "resendUsedHeading",
        "resendUsedBody",
        "alreadySentHeading",
        "alreadySentBodyTemplate",
        "sendPageOpenedHeadingTemplate",
        "sendPageOpenedBody",
        "sendLinkInvalidHeading",
        "sendLinkInvalidBody",
        "sendFailedNotice",
      ].sort(),
    );
  });

  it("uses the pending heading and subheading for an unpaid gift", () => {
    const props = derive({ kind: "not_paid", buyerFirstName: "Dana" });
    expect(props).toEqual({ state: "pending_payment", copy: expect.any(Object) });
    expect(props.copy.heading).toBe("Thank you, Dana.");
    expect(props.copy.subheading).toBe(GIFT_DEFAULTS.pendingSubheading);
    expect(props.copy.pendingBody).toBe(GIFT_DEFAULTS.pendingBody);
  });
});

describe("deriveGiftThankYouViewProps state", () => {
  it("passes the note as typed, without filling tokens inside it", () => {
    const props = derive({ ...ACTIVE_GIFT, note: "Use {code} with {buyerName} for {reading}" });
    expect(props).toMatchObject({
      state: "active",
      note: { buyerFirstName: "Dana", text: "Use {code} with {buyerName} for {reading}" },
    });
  });

  it("carries the send token as noteEdit for an active gift", () => {
    expect(derive(ACTIVE_GIFT)).toMatchObject({ noteEdit: { token: "send-token" } });
  });

  it("sets noteEdit and send to null without a send token", () => {
    expect(derive({ ...ACTIVE_GIFT, sendToken: null })).toMatchObject({
      noteEdit: null,
      send: null,
    });
  });

  it("carries the send token and the send status of an active gift as send", () => {
    const sendStatus = {
      ...ACTIVE_GIFT.sendStatus,
      state: "sent",
      recipientName: "Anna",
      lastSentAt: "2026-10-03T09:00:00.000Z",
    } as const;
    expect(derive({ ...ACTIVE_GIFT, sendStatus })).toMatchObject({
      send: { token: "send-token", status: sendStatus },
    });
  });

  it("shows the code without note editing for a redeemed gift", () => {
    const props = derive({ kind: "redeemed", ...SHOWN_GIFT });
    expect(props).toMatchObject({ state: "redeemed", displayCode: SHOWN_GIFT.displayCode });
    expect(props).not.toHaveProperty("noteEdit");
    expect(props).not.toHaveProperty("note");
    expect(props).not.toHaveProperty("send");
  });
});
