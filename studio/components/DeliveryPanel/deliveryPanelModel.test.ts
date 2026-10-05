import { describe, expect, it } from "vitest";

import {
  DELIVERY_COPY,
  type DeliveryPanelDocument,
  deliveryPanelModel,
  GIFT_RESEND_COPY,
  sentLine,
} from "./deliveryPanelModel";

const READY: DeliveryPanelDocument = {
  status: "paid",
  email: "anna@email.com",
  voiceNote: { asset: { _ref: "file-voice" } },
  readingPdf: { asset: { _ref: "file-pdf" } },
};

const DRAFT = { _id: "drafts.sub_1" };
const SENT = [{ type: "reading_delivery", sentAt: "2026-10-04T06:25:14.000Z" }];

const OPEN_BOUNCE = {
  _key: "reading_delivery-0",
  emailType: "reading_delivery",
  kind: "bounced",
  recipient: "anna@emial.com",
  attemptNumber: 1,
  failedAt: "2026-10-04T06:15:20.000Z",
};

describe("deliveryPanelModel send section", () => {
  it("offers Send reading now with the address when both files are published", () => {
    expect(deliveryPanelModel({ published: READY })).toMatchObject({
      statusLine: "Sends the delivery email to anna@email.com.",
      button: { kind: "send", enabled: true },
    });
  });

  it.each([
    ["the voice note", { voiceNote: undefined }],
    ["the PDF asset", { readingPdf: {} }],
  ])("disables sending while %s is missing", (_label, missing) => {
    expect(deliveryPanelModel({ published: { ...READY, ...missing } })).toMatchObject({
      statusLine: DELIVERY_COPY.filesMissing,
      button: { kind: "send", enabled: false },
    });
  });

  it("disables sending while there are unpublished changes", () => {
    expect(deliveryPanelModel({ published: READY, draft: DRAFT })).toMatchObject({
      statusLine: DELIVERY_COPY.unpublishedChanges,
      button: { kind: "send", enabled: false },
    });
  });

  it("shows the request without a button, even with a draft", () => {
    expect(
      deliveryPanelModel({
        published: { ...READY, deliveryRequestedAt: "2026-10-04T06:10:00Z" },
        draft: DRAFT,
      }),
    ).toMatchObject({ statusLine: DELIVERY_COPY.requested, button: null });
  });

  it("offers Try again after a failed send", () => {
    expect(
      deliveryPanelModel({ published: { ...READY, deliveryFailedAt: "2026-10-04T06:10:00Z" } }),
    ).toMatchObject({
      statusLine: DELIVERY_COPY.failed,
      button: { kind: "tryAgain", enabled: true },
    });
  });

  it.each([
    ["a file is missing", { ...READY, readingPdf: undefined }, undefined],
    ["a draft exists", READY, DRAFT],
  ])("blocks Try again while %s", (_label, published, draft) => {
    expect(
      deliveryPanelModel({
        published: { ...published, deliveryFailedAt: "2026-10-04T06:10:00Z" },
        draft,
      }).button,
    ).toEqual({ kind: "tryAgain", enabled: false });
  });

  it.each([
    ["a reading_delivery entry", SENT],
    ["a legacy day7 entry", [{ type: "day7", sentAt: "2026-10-04T06:25:14.000Z" }]],
  ])("shows the sent time and no button for %s", (_label, emailsFired) => {
    const model = deliveryPanelModel({ published: { ...READY, emailsFired } });

    expect(model.button).toBeNull();
    expect(model.statusLine).toMatch(/^Delivery email sent \d{1,2} Oct 2026, \d{2}:\d{2}\.$/);
  });

  it("shows sent over a request and a failure", () => {
    expect(
      deliveryPanelModel({
        published: {
          ...READY,
          emailsFired: SENT,
          deliveryRequestedAt: "2026-10-04T06:10:00Z",
          deliveryFailedAt: "2026-10-04T06:12:00Z",
        },
      }).button,
    ).toBeNull();
  });
});

describe("deliveryPanelModel resend section", () => {
  it("allows resending with no line when nothing blocks it", () => {
    expect(deliveryPanelModel({ published: READY })).toMatchObject({
      failedSends: [],
      resendTypes: ["order_confirmation", "reading_delivery"],
      defaultResendType: "order_confirmation",
      resendLine: null,
    });
  });

  it("offers only the order confirmation until both files are published", () => {
    const model = deliveryPanelModel({
      published: { ...READY, voiceNote: undefined, emailFailures: [OPEN_BOUNCE] },
    });

    expect(model.resendTypes).toEqual(["order_confirmation"]);
    expect(model.defaultResendType).toBe("order_confirmation");
  });

  it("blocks resending while there are unpublished changes", () => {
    expect(deliveryPanelModel({ published: READY, draft: DRAFT }).resendLine).toBe(
      DELIVERY_COPY.unpublishedChanges,
    );
  });

  it("blocks resending while a resend request is waiting", () => {
    expect(
      deliveryPanelModel({
        published: { ...READY, emailResendRequest: { requestedAt: "2026-10-04T06:20:00Z" } },
      }).resendLine,
    ).toBe(DELIVERY_COPY.resendRequested);
  });

  it("lists only open failed sends and defaults the resend to the first one's email", () => {
    const model = deliveryPanelModel({
      published: {
        ...READY,
        emailFailures: [
          OPEN_BOUNCE,
          {
            ...OPEN_BOUNCE,
            _key: "order_confirmation-1",
            emailType: "order_confirmation",
            resolvedAt: "2026-10-04T06:30:00Z",
          },
        ],
      },
    });

    expect(model.failedSends).toEqual([
      expect.objectContaining({
        key: "reading_delivery-0",
        emailType: "reading_delivery",
        title: "Reading delivery: Bounced",
      }),
    ]);
    expect(model.defaultResendType).toBe("reading_delivery");
  });
});

describe("deliveryPanelModel on a gift not opened yet", () => {
  const GIFT_WAITING: DeliveryPanelDocument = { status: "gift_waiting" };

  it("says it is waiting for the recipient, with no send button and nothing to resend", () => {
    expect(deliveryPanelModel({ published: GIFT_WAITING })).toEqual({
      statusLine: DELIVERY_COPY.giftWaiting,
      button: null,
      failedSends: [],
      resendTypes: [],
      defaultResendType: "order_confirmation",
      resendLine: null,
      giftFailedSends: [],
    });
  });

  it("stays waiting even with files uploaded and a draft open", () => {
    expect(
      deliveryPanelModel({
        published: { ...GIFT_WAITING, voiceNote: READY.voiceNote, readingPdf: READY.readingPdf },
        draft: DRAFT,
      }),
    ).toMatchObject({ statusLine: DELIVERY_COPY.giftWaiting, button: null, resendTypes: [] });
  });
});

describe("deliveryPanelModel gift failures", () => {
  const giftFailure = (emailType: string, extra: Record<string, unknown> = {}) => ({
    _key: `${emailType}-0`,
    emailType,
    kind: "bounced",
    recipient: emailType === "gift_send" ? "recipient" : "buyer",
    attemptNumber: 1,
    failedAt: "2026-10-04T06:15:20.000Z",
    ...extra,
  });
  const GIFT_FAILURES = [
    giftFailure("gift_confirmation"),
    giftFailure("gift_send"),
    giftFailure("gift_opened"),
    giftFailure("gift_send", { _key: "gift_send-1", resolvedAt: "2026-10-04T07:00:00.000Z" }),
  ];
  const rows = (status: string) =>
    deliveryPanelModel({
      published: { ...READY, status, gift: { emailFailures: GIFT_FAILURES } },
    }).giftFailedSends;

  it("lists the open gift failures by role, never by address", () => {
    expect(rows("gift_waiting").map(({ key, title, subtitle }) => ({ key, title, subtitle }))).toEqual([
      {
        key: "gift_confirmation-0",
        title: "Gift confirmation: Bounced",
        subtitle: expect.stringMatching(/to the buyer$/),
      },
      {
        key: "gift_send-0",
        title: "Gift email: Bounced",
        subtitle: expect.stringMatching(/to the recipient$/),
      },
      {
        key: "gift_opened-0",
        title: "Gift opened: Bounced",
        subtitle: expect.stringMatching(/to the buyer$/),
      },
    ]);
  });

  it("offers the buyer confirmation for confirmation and gift email failures while the gift waits", () => {
    expect(rows("gift_waiting").map(({ emailType, resendable }) => [emailType, resendable])).toEqual([
      ["gift_confirmation", true],
      ["gift_send", true],
      ["gift_opened", false],
    ]);
    expect(GIFT_RESEND_COPY.gift_send.label).toBe("Resend gift confirmation to buyer");
  });

  it("offers only the gift opened email once the gift is opened", () => {
    expect(rows("paid").map(({ emailType, resendable }) => [emailType, resendable])).toEqual([
      ["gift_confirmation", false],
      ["gift_send", false],
      ["gift_opened", true],
    ]);
  });

  it("offers nothing on a cancelled gift", () => {
    expect(rows("gift_cancelled").every((row) => !row.resendable)).toBe(true);
  });

  it("blocks gift resends while a request is waiting or a draft is open", () => {
    expect(
      deliveryPanelModel({
        published: {
          status: "gift_waiting",
          gift: { emailFailures: GIFT_FAILURES },
          emailResendRequest: { requestedAt: "2026-10-04T06:20:00Z" },
        },
      }).resendLine,
    ).toBe(DELIVERY_COPY.resendRequested);
    expect(
      deliveryPanelModel({ published: { status: "gift_waiting" }, draft: DRAFT }).resendLine,
    ).toBe(DELIVERY_COPY.unpublishedChanges);
  });
});

describe("sentLine", () => {
  it("says sent without a date when the time is missing", () => {
    expect(sentLine(undefined)).toBe(DELIVERY_COPY.sentNoDate);
  });
});
