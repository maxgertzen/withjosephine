import { describe, expect, it } from "vitest";

import {
  asCustomerEmailType,
  currentEmailFiredType,
  findReadingDeliveryEntry,
  isEmailFiredOfType,
  storedEmailFiredTypes,
} from "./emailFiredType";

describe("currentEmailFiredType", () => {
  it.each([
    ["day7", "reading_delivery"],
    ["day7-overdue-alert", "reading_overdue_alert"],
    ["reading_delivery", "reading_delivery"],
    ["order_confirmation", "order_confirmation"],
    ["gift_recipient_confirmation", "order_confirmation"],
    ["constructor", "constructor"],
  ])("maps %s to %s", (stored, current) => {
    expect(currentEmailFiredType(stored)).toBe(current);
  });
});

describe("storedEmailFiredTypes", () => {
  it("lists the current value first, then its legacy value", () => {
    expect(storedEmailFiredTypes("reading_delivery")).toEqual(["reading_delivery", "day7"]);
    expect(storedEmailFiredTypes("reading_overdue_alert")).toEqual([
      "reading_overdue_alert",
      "day7-overdue-alert",
    ]);
  });

  it("lists the gift recipient confirmation under the order confirmation", () => {
    expect(storedEmailFiredTypes("order_confirmation")).toEqual([
      "order_confirmation",
      "gift_recipient_confirmation",
    ]);
  });

  it("lists only the current value when there is no other value", () => {
    expect(storedEmailFiredTypes("day14")).toEqual(["day14"]);
    expect(storedEmailFiredTypes("gift_recipient_confirmation")).toEqual([
      "gift_recipient_confirmation",
    ]);
  });
});

describe("isEmailFiredOfType", () => {
  it("matches the current and the legacy value and nothing else", () => {
    expect(isEmailFiredOfType("reading_delivery", "reading_delivery")).toBe(true);
    expect(isEmailFiredOfType("day7", "reading_delivery")).toBe(true);
    expect(isEmailFiredOfType("day7-overdue-alert", "reading_delivery")).toBe(false);
    expect(isEmailFiredOfType(undefined, "reading_delivery")).toBe(false);
  });

  it("counts a gift recipient confirmation as an order confirmation and as itself", () => {
    expect(isEmailFiredOfType("gift_recipient_confirmation", "order_confirmation")).toBe(true);
    expect(isEmailFiredOfType("gift_recipient_confirmation", "gift_recipient_confirmation")).toBe(
      true,
    );
    expect(isEmailFiredOfType("order_confirmation", "gift_recipient_confirmation")).toBe(false);
  });
});

describe("findReadingDeliveryEntry", () => {
  it.each(["reading_delivery", "day7"])("finds an entry stored as %s", (type) => {
    const entry = { type, sentAt: "2026-10-03T14:02:00.000Z" };
    expect(findReadingDeliveryEntry([{ type: "order_confirmation" }, entry])).toBe(entry);
  });

  it("returns undefined without a reading delivery entry", () => {
    expect(findReadingDeliveryEntry([{ type: "day7-overdue-alert" }])).toBeUndefined();
    expect(findReadingDeliveryEntry(undefined)).toBeUndefined();
  });
});

describe("asCustomerEmailType", () => {
  it.each([
    ["order_confirmation", "order_confirmation"],
    ["reading_delivery", "reading_delivery"],
    ["day7", "reading_delivery"],
    ["gift_recipient_confirmation", "order_confirmation"],
    ["reading_overdue_alert", null],
    ["magic_link", null],
    [undefined, null],
  ] as const)("maps %s to %s", (stored, expected) => {
    expect(asCustomerEmailType(stored)).toBe(expected);
  });
});
