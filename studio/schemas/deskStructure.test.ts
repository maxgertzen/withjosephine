import type { StructureBuilder } from "sanity/structure";
import { describe, expect, it, vi } from "vitest";

vi.mock("../views/EmailPreview", () => ({ EmailPreview: () => null }));
vi.mock("../views/StudioPagePreview", () => ({
  ListenPagePreview: () => null,
  MagicLinkVerifyPagePreview: () => null,
  ThankYouPagePreview: () => null,
}));

import { deskStructure, FAILED_SENDS_FILTER } from "./deskStructure";

type FakeNode = { kind: string; calls: Record<string, unknown[]> };

function fakeNode(kind: string): FakeNode {
  const node: FakeNode = { kind, calls: {} };
  const chain: FakeNode = new Proxy(node, {
    get: (target, key) =>
      key in target
        ? target[key as keyof FakeNode]
        : (...args: unknown[]) => {
            target.calls[String(key)] = args;
            return chain;
          },
  });
  return chain;
}

const viewBuilder = new Proxy({}, { get: (_, kind) => () => fakeNode(`view.${String(kind)}`) });

const S = new Proxy(
  {},
  { get: (_, kind) => (kind === "view" ? viewBuilder : () => fakeNode(String(kind))) },
) as unknown as StructureBuilder;

const root = deskStructure(S) as unknown as FakeNode;

const itemsOf = (node: FakeNode) => node.calls.items[0] as FakeNode[];
const childOf = (node: FakeNode) => node.calls.child[0] as FakeNode;
const idOf = (node: FakeNode) => (node.calls.id?.[0] as string | undefined) ?? node.kind;
const ids = (node: FakeNode) => itemsOf(node).map(idOf);

function item(parent: FakeNode, id: string): FakeNode {
  const found = itemsOf(parent).find((candidate) => idOf(candidate) === id);
  if (!found) throw new Error(`no desk item ${id}`);
  return found;
}

const listOf = (parent: FakeNode, id: string) => childOf(item(parent, id));
const filterOf = (parent: FakeNode, id: string) => childOf(item(parent, id)).calls.filter[0];

const GIFT_SINGLETONS = [
  "giftSettings",
  "emailGiftPurchase",
  "emailGiftToRecipient",
  "emailGiftOpened",
  "emailGiftRecipientConfirmation",
];

describe("desk structure submissions", () => {
  const submissions = listOf(root, "submissionsRoot");

  it("puts Gifts not opened yet between paid and delivered", () => {
    expect(ids(submissions)).toEqual([
      "submissionsAwaitingPayment",
      "submissionsPaidAwaitingDelivery",
      "submissionsGiftsNotOpenedYet",
      "submissionsDelivered",
    ]);
  });

  it("lists gift_waiting submissions under Gifts not opened yet", () => {
    const giftsNotOpened = item(submissions, "submissionsGiftsNotOpenedYet");
    expect(giftsNotOpened.calls.title).toEqual(["🎁 Gifts not opened yet"]);
    expect(childOf(giftsNotOpened).calls.schemaType).toEqual(["submission"]);
    expect(childOf(giftsNotOpened).calls.filter).toEqual([
      '_type == "submission" && status == "gift_waiting"',
    ]);
  });
});

describe("desk structure failed sends", () => {
  const failedSends = item(root, "submissionsFailedSends");

  it("lists submissions with an open booking failure or an open gift email failure", () => {
    expect(childOf(failedSends).calls.filter).toEqual([FAILED_SENDS_FILTER]);
    expect(FAILED_SENDS_FILTER).toContain("count(emailFailures[!defined(resolvedAt)]) > 0");
    expect(FAILED_SENDS_FILTER).toContain("count(gift.emailFailures[!defined(resolvedAt)]) > 0");
  });

  it("orders by payment, then by creation for gifts not paid for by a recipient", () => {
    expect(childOf(failedSends).calls.defaultOrdering).toEqual([
      [
        { field: "paidAt", direction: "asc" },
        { field: "createdAt", direction: "asc" },
      ],
    ]);
  });
});

describe("desk structure gift documents", () => {
  const bookingFlow = listOf(listOf(root, "pagesGroup"), "bookingFlowGroup");

  it("shows Gift Settings and the gift emails under Booking Flow", () => {
    expect(ids(bookingFlow)).toEqual(
      expect.arrayContaining(["bookingPage", "thankYouPage", "bookingForm", ...GIFT_SINGLETONS]),
    );
  });

  it("no longer shows the gift emails under Emails", () => {
    const emails = ids(listOf(root, "emailsGroup"));
    for (const id of GIFT_SINGLETONS) expect(emails).not.toContain(id);
    expect(emails).toContain("emailOrderConfirmation");
  });

  it("keeps the old gift record list on its own under Gifts", () => {
    const gifts = listOf(root, "giftsGroup");
    expect(ids(gifts)).toEqual(["giftRecords"]);
    expect(filterOf(gifts, "giftRecords")).toBe('_type == "giftRecord"');
  });
});
