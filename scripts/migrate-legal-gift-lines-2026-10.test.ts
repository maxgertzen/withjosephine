import { describe, expect, it } from "vitest";

import {
  LEGAL_LINE_EDITS,
  type LegalPageDoc,
  planLegalPage,
} from "./migrate-legal-gift-lines-2026-10";

const TODAY = "2026-10-04";

const editFor = (pageId: string) => {
  const edit = LEGAL_LINE_EDITS.find((candidate) => candidate.pageId === pageId);
  if (!edit) throw new Error(`no edit for ${pageId}`);
  return edit;
};

const docWithText = (
  pageId: string,
  text: string,
  overrides: Partial<LegalPageDoc> = {},
): LegalPageDoc => ({
  _id: pageId,
  _rev: "rev1",
  lastUpdated: "2026-07-07",
  body: [
    { _key: "heading", children: [{ _key: "heading-s0", text: "Heading" }] },
    { _key: "b2", children: [{ _key: "b2-s0", text }] },
  ],
  ...overrides,
});

const TERMS_TEXT =
  "You must be 18 years of age or older to book a reading. By booking you confirm you are. Gift bookings for someone else are welcome, provided that person also meets this requirement and has consented to having a reading done for them.";
const REFUND_TEXT =
  "Because you complete the intake form before payment, your reading has already begun by the time your purchase is made. For that reason all sales are final once payment is complete.";
const PRIVACY_TEXT =
  "Several processors are US-based (Stripe, Sanity, Mixpanel, Microsoft) and operate under the EU–US and UK Data Privacy Framework and Standard Contractual Clauses.";

describe("planLegalPage", () => {
  it("appends the gift lines to the Terms gift booking sentence and bumps lastUpdated", () => {
    const plan = planLegalPage(
      docWithText("legalPage-terms", TERMS_TEXT),
      editFor("legalPage-terms"),
      TODAY,
    );

    expect(plan).toEqual({
      outcome: "patch",
      oldText: TERMS_TEXT,
      set: {
        'body[_key=="b2"].children[_key=="b2-s0"].text': `${TERMS_TEXT} A gift is one reading. A gift code does not expire. Gifts are non-refundable.`,
        lastUpdated: TODAY,
      },
    });
  });

  it("appends the gift line after the Refund Policy all-sales-final sentence", () => {
    const plan = planLegalPage(
      docWithText("legalPage-refund-policy", REFUND_TEXT),
      editFor("legalPage-refund-policy"),
      TODAY,
    );

    expect(
      plan.outcome === "patch" && plan.set['body[_key=="b2"].children[_key=="b2-s0"].text'],
    ).toBe(`${REFUND_TEXT} Gifts are non-refundable, before and after the gift is opened.`);
  });

  it("adds Resend to the Privacy US-based processor list and keeps the rest of the sentence", () => {
    const plan = planLegalPage(
      docWithText("legalPage-privacy", PRIVACY_TEXT),
      editFor("legalPage-privacy"),
      TODAY,
    );

    expect(
      plan.outcome === "patch" && plan.set['body[_key=="b2"].children[_key=="b2-s0"].text'],
    ).toBe(
      "Several processors are US-based (Stripe, Sanity, Mixpanel, Microsoft, Resend) and operate under the EU–US and UK Data Privacy Framework and Standard Contractual Clauses.",
    );
  });

  it("changes nothing on a second run", () => {
    const edit = editFor("legalPage-terms");
    const first = planLegalPage(docWithText(edit.pageId, TERMS_TEXT), edit, TODAY);
    if (first.outcome !== "patch") throw new Error("expected a patch on the first run");
    const patchedText = Object.values(first.set)[0];

    expect(planLegalPage(docWithText(edit.pageId, patchedText), edit, TODAY)).toEqual({
      outcome: "already-applied",
    });
  });

  it("reports a body that no longer carries the anchor sentence", () => {
    const edit = editFor("legalPage-terms");

    expect(planLegalPage(docWithText(edit.pageId, "Edited in Studio."), edit, TODAY)).toEqual({
      outcome: "anchor-not-found",
    });
  });

  it("leaves an empty body alone, so the code fallback keeps rendering", () => {
    const edit = editFor("legalPage-privacy");

    expect(planLegalPage(docWithText(edit.pageId, "", { body: [] }), edit, TODAY)).toEqual({
      outcome: "empty-body",
    });
  });

  it("never moves lastUpdated backwards", () => {
    const edit = editFor("legalPage-privacy");
    const plan = planLegalPage(
      docWithText(edit.pageId, PRIVACY_TEXT, { lastUpdated: "2026-12-01" }),
      edit,
      TODAY,
    );

    expect(plan.outcome === "patch" && plan.set.lastUpdated).toBeUndefined();
  });
});
