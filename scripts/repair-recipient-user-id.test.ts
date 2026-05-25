import { describe, expect, it } from "vitest";
import { classifyRow, normalizeEmail, type DetectorRow } from "./repair-recipient-user-id.mts";

const baseRow: DetectorRow = {
  submission_id: "00000000-0000-0000-0000-000000000000",
  recipient_email: "recipient@example.com",
  purchaser_email: "purchaser@example.com",
  current_recipient_user_id: "user-purchaser",
  current_recipient_user_email: "purchaser@example.com",
  purchaser_user_id: "user-purchaser",
  gift_claimed_at: 1700000000000,
  delivered_at: null,
};

describe("normalizeEmail", () => {
  it("trims + lowercases", () => {
    expect(normalizeEmail("  Foo@Example.com  ")).toBe("foo@example.com");
  });
});

describe("classifyRow", () => {
  it("repairs bb5fe157-shape even when delivered_at is set (B5a dropped 2026-05-25)", () => {
    const lookup = (email: string) => (email === "recipient@example.com" ? { id: "user-recipient" } : null);
    const result = classifyRow({ ...baseRow, delivered_at: 1700000000001 }, lookup);
    expect(result.proposed_action).toBe("update");
  });

  it("ambiguous-skip when gift_claimed_at is null", () => {
    const lookup = () => ({ id: "user-recipient" });
    const result = classifyRow({ ...baseRow, gift_claimed_at: null }, lookup);
    expect(result.proposed_action).toBe("ambiguous-skip");
    expect(result.reason).toMatch(/gift_claimed_at/);
  });

  it("ambiguous-skip when current user is a third party (forwarded gift)", () => {
    const lookup = () => ({ id: "user-recipient" });
    const result = classifyRow(
      {
        ...baseRow,
        current_recipient_user_email: "spouse@example.com",
        current_recipient_user_id: "user-spouse",
      },
      lookup,
    );
    expect(result.proposed_action).toBe("ambiguous-skip");
    expect(result.reason).toMatch(/third-party|forwarded/);
  });

  it("update when bb5fe157 shape and target user exists", () => {
    const lookup = (email: string) => (email === "recipient@example.com" ? { id: "user-recipient" } : null);
    const result = classifyRow(baseRow, lookup);
    expect(result.proposed_action).toBe("update");
    expect(result.proposed_recipient_user_id).toBe("user-recipient");
  });

  it("create-then-update when bb5fe157 shape and target user is missing", () => {
    const lookup = () => null;
    const result = classifyRow(baseRow, lookup);
    expect(result.proposed_action).toBe("create-then-update");
    expect(result.proposed_recipient_user_id).toBeNull();
  });

  it("update when FK orphan (current_recipient_user_email is null) and target user exists", () => {
    const lookup = () => ({ id: "user-recipient" });
    const result = classifyRow(
      { ...baseRow, current_recipient_user_email: null, current_recipient_user_id: "stale-id" },
      lookup,
    );
    expect(result.proposed_action).toBe("update");
    expect(result.proposed_recipient_user_id).toBe("user-recipient");
  });

  it("create-then-update when FK orphan and target user missing", () => {
    const lookup = () => null;
    const result = classifyRow(
      { ...baseRow, current_recipient_user_email: null, current_recipient_user_id: "stale-id" },
      lookup,
    );
    expect(result.proposed_action).toBe("create-then-update");
  });

  it("ambiguous-skip no-op when FK orphan but lookup returns the same stale id", () => {
    // FK-orphan shape: currentResolvedEmail = null (passes the third-party
    // gate). But userLookup happens to return a user whose id matches the
    // current (orphaned) recipient_user_id — defensive no-op safeguard.
    const lookup = () => ({ id: "stale-id" });
    const result = classifyRow(
      { ...baseRow, current_recipient_user_email: null, current_recipient_user_id: "stale-id" },
      lookup,
    );
    expect(result.proposed_action).toBe("ambiguous-skip");
    expect(result.reason).toMatch(/no-op/);
  });

  it("normalizes email case + whitespace when comparing", () => {
    const lookup = (email: string) => (email === "recipient@example.com" ? { id: "user-recipient" } : null);
    const result = classifyRow({ ...baseRow, recipient_email: "  Recipient@Example.com  " }, lookup);
    expect(result.proposed_action).toBe("update");
  });
});
