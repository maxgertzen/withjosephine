import { describe, expect, it } from "vitest";

import {
  requestBlocker,
  type SendReadingNowDocument,
  sendReadingNowState,
} from "./sendReadingNowState";

const WITH_FILES: SendReadingNowDocument = {
  status: "paid",
  email: "anna@email.com",
  voiceNote: { asset: { _ref: "file-voice" } },
  readingPdf: { asset: { _ref: "file-pdf" } },
};

const DELIVERY_SENT = [{ type: "reading_delivery", sentAt: "2026-10-03T14:02:00.000Z" }];

describe("sendReadingNowState", () => {
  it("is ready when both files are published and there is no draft", () => {
    expect(sendReadingNowState({ published: WITH_FILES, draft: null })).toBe("ready");
  });

  it("is filesMissing when the voice note is missing", () => {
    expect(
      sendReadingNowState({ published: { ...WITH_FILES, voiceNote: undefined } }),
    ).toBe("filesMissing");
  });

  it("is filesMissing when the PDF has no asset", () => {
    expect(sendReadingNowState({ published: { ...WITH_FILES, readingPdf: {} } })).toBe(
      "filesMissing",
    );
  });

  it("is unpublishedChanges when a draft exists", () => {
    expect(sendReadingNowState({ published: WITH_FILES, draft: { _id: "drafts.sub_1" } })).toBe(
      "unpublishedChanges",
    );
  });

  it("is requested while the request marker is set", () => {
    expect(
      sendReadingNowState({
        published: { ...WITH_FILES, deliveryRequestedAt: "2026-10-03T14:00:00.000Z" },
        draft: { _id: "drafts.sub_1" },
      }),
    ).toBe("requested");
  });

  it("is failed when the last request failed", () => {
    expect(
      sendReadingNowState({
        published: { ...WITH_FILES, deliveryFailedAt: "2026-10-03T14:05:00.000Z" },
      }),
    ).toBe("failed");
  });

  it.each([
    ["a reading_delivery", DELIVERY_SENT],
    ["a legacy day7", [{ type: "day7", sentAt: "2026-10-03T14:02:00.000Z" }]],
  ])("is sent when emailsFired has %s entry", (_label, emailsFired) => {
    expect(sendReadingNowState({ published: { ...WITH_FILES, emailsFired } })).toBe("sent");
  });

  it("is sent over failed and requested", () => {
    expect(
      sendReadingNowState({
        published: {
          ...WITH_FILES,
          emailsFired: DELIVERY_SENT,
          deliveryRequestedAt: "2026-10-03T14:00:00.000Z",
          deliveryFailedAt: "2026-10-03T14:05:00.000Z",
        },
      }),
    ).toBe("sent");
  });

  it("blocks a retry after a failure while a file is missing or a draft exists", () => {
    const failed = { ...WITH_FILES, deliveryFailedAt: "2026-10-03T14:05:00.000Z" };

    expect(requestBlocker({ published: failed })).toBeNull();
    expect(requestBlocker({ published: { ...failed, readingPdf: {} } })).toBe("filesMissing");
    expect(requestBlocker({ published: failed, draft: { _id: "drafts.sub_1" } })).toBe(
      "unpublishedChanges",
    );
  });

  it("ignores emails other than the reading delivery", () => {
    expect(
      sendReadingNowState({
        published: { ...WITH_FILES, emailsFired: [{ type: "order_confirmation" }] },
      }),
    ).toBe("ready");
  });
});
