import { describe, expect, it } from "vitest";

import { dbQuery } from "@/lib/booking/persistence/sqlClient";

import {
  COOKIE_NAME,
  getActiveSession,
  hashIp,
  hashUserAgent,
  issueMagicLink,
  MAGIC_LINK_TTL_MS,
  redeemMagicLink,
  requireListenSession,
  revokeSession,
  SESSION_TTL_MS,
} from "./listenSession";

const SUBMISSION_ID = "sub_test_1";
const SECRET = "test-secret-32-bytes-of-hex-here";

describe("listenSession", () => {
  describe("hashing helpers", () => {
    it("produces consistent SHA-256 hex for the same UA", async () => {
      const a = await hashUserAgent("Mozilla/5.0 ...");
      const b = await hashUserAgent("Mozilla/5.0 ...");
      expect(a).toBe(b);
      expect(a).toMatch(/^[0-9a-f]{64}$/);
    });

    it("yields a different hash for a different UA", async () => {
      const a = await hashUserAgent("Mozilla/5.0 ...");
      const b = await hashUserAgent("curl/8.0");
      expect(a).not.toBe(b);
    });

    it("hashIp uses a daily-rotating salt — same day, same hash", async () => {
      const now = Date.UTC(2026, 4, 9, 12, 0, 0);
      const a = await hashIp("203.0.113.5", SECRET, now);
      const b = await hashIp("203.0.113.5", SECRET, now + 60_000);
      expect(a).toBe(b);
    });

    it("hashIp rotates across day boundaries — different day, different hash", async () => {
      const day1 = Date.UTC(2026, 4, 9, 12, 0, 0);
      const day2 = day1 + 24 * 60 * 60 * 1000;
      const a = await hashIp("203.0.113.5", SECRET, day1);
      const b = await hashIp("203.0.113.5", SECRET, day2);
      expect(a).not.toBe(b);
    });
  });

  describe("issueMagicLink", () => {
    it("returns a hex token of plausible entropy and stores SHA-256 hash, not plaintext", async () => {
      const { token } = await issueMagicLink({ submissionId: SUBMISSION_ID });
      expect(token).toMatch(/^[0-9a-f]{64}$/); // 32 bytes hex
      const rows = await dbQuery<{ token_hash: string }>(
        `SELECT token_hash FROM listen_magic_link WHERE submission_id = ?`,
        [SUBMISSION_ID],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]!.token_hash).not.toBe(token); // raw token never persisted
      expect(rows[0]!.token_hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("sets expiry exactly MAGIC_LINK_TTL_MS in the future", async () => {
      const now = 1_700_000_000_000;
      const { expiresAt } = await issueMagicLink({ submissionId: SUBMISSION_ID, now });
      expect(expiresAt).toBe(now + MAGIC_LINK_TTL_MS);
    });

    it("writes a link_issued audit row tagged success=1", async () => {
      await issueMagicLink({ submissionId: SUBMISSION_ID });
      const rows = await dbQuery<{ event_type: string; success: number }>(
        `SELECT event_type, success FROM listen_audit WHERE submission_id = ?`,
        [SUBMISSION_ID],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({ event_type: "link_issued", success: 1 });
    });
  });

  describe("redeemMagicLink", () => {
    it("returns ok + submissionId + cookie value on first redeem", async () => {
      const { token } = await issueMagicLink({ submissionId: SUBMISSION_ID });
      const result = await redeemMagicLink({ token });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("typeguard");
      expect(result.submissionId).toBe(SUBMISSION_ID);
      expect(result.cookieValue).toMatch(/^[0-9a-f]{64}$/);
      expect(result.sessionId).toMatch(/^[0-9a-f-]{36}$/); // UUID
    });

    it("rejects a second redeem of the same token (single-use)", async () => {
      const { token } = await issueMagicLink({ submissionId: SUBMISSION_ID });
      await redeemMagicLink({ token });
      const second = await redeemMagicLink({ token });
      expect(second).toEqual({ ok: false, reason: "already_consumed" });
    });

    it("rejects an expired magic link", async () => {
      const past = Date.now() - 2 * MAGIC_LINK_TTL_MS;
      const { token } = await issueMagicLink({ submissionId: SUBMISSION_ID, now: past });
      const result = await redeemMagicLink({ token });
      expect(result).toEqual({ ok: false, reason: "expired" });
    });

    it("rejects an invalid token (no DB row)", async () => {
      const result = await redeemMagicLink({ token: "deadbeef".repeat(8) });
      expect(result).toEqual({ ok: false, reason: "invalid" });
    });

    it("creates a session row tied to the submissionId", async () => {
      const { token } = await issueMagicLink({ submissionId: SUBMISSION_ID });
      const result = await redeemMagicLink({ token });
      if (!result.ok) throw new Error("typeguard");
      const rows = await dbQuery<{ submission_id: string; revoked_at: number | null }>(
        `SELECT submission_id, revoked_at FROM listen_session WHERE id = ?`,
        [result.sessionId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({ submission_id: SUBMISSION_ID, revoked_at: null });
    });
  });

  describe("requireListenSession", () => {
    it("returns true for a valid session matching the submissionId", async () => {
      const { token } = await issueMagicLink({ submissionId: SUBMISSION_ID });
      const result = await redeemMagicLink({ token });
      if (!result.ok) throw new Error("typeguard");
      const ok = await requireListenSession({
        cookieValue: result.cookieValue,
        submissionId: SUBMISSION_ID,
      });
      expect(ok).toBe(true);
    });

    it("returns false for a session minted for a different submission (cross-submission denial)", async () => {
      const { token } = await issueMagicLink({ submissionId: "sub_a" });
      const result = await redeemMagicLink({ token });
      if (!result.ok) throw new Error("typeguard");
      const okWrongSubmission = await requireListenSession({
        cookieValue: result.cookieValue,
        submissionId: "sub_b",
      });
      expect(okWrongSubmission).toBe(false);
    });

    it("returns false when cookie is empty", async () => {
      const ok = await requireListenSession({ cookieValue: "", submissionId: SUBMISSION_ID });
      expect(ok).toBe(false);
    });

    it("returns false when cookie does not map to any session", async () => {
      const ok = await requireListenSession({
        cookieValue: "f".repeat(64),
        submissionId: SUBMISSION_ID,
      });
      expect(ok).toBe(false);
    });

    it("returns false for an expired session", async () => {
      const past = Date.now() - 2 * SESSION_TTL_MS;
      const { token } = await issueMagicLink({ submissionId: SUBMISSION_ID, now: past });
      const result = await redeemMagicLink({ token, now: past });
      if (!result.ok) throw new Error("typeguard");
      const ok = await requireListenSession({
        cookieValue: result.cookieValue,
        submissionId: SUBMISSION_ID,
      });
      expect(ok).toBe(false);
    });

    it("returns false after the session is explicitly revoked", async () => {
      const { token } = await issueMagicLink({ submissionId: SUBMISSION_ID });
      const result = await redeemMagicLink({ token });
      if (!result.ok) throw new Error("typeguard");
      await revokeSession({ sessionId: result.sessionId });
      const ok = await requireListenSession({
        cookieValue: result.cookieValue,
        submissionId: SUBMISSION_ID,
      });
      expect(ok).toBe(false);
    });
  });

  describe("getActiveSession", () => {
    it("returns submissionId + sessionId for a live cookie", async () => {
      const { token } = await issueMagicLink({ submissionId: SUBMISSION_ID });
      const result = await redeemMagicLink({ token });
      if (!result.ok) throw new Error("typeguard");
      const session = await getActiveSession({ cookieValue: result.cookieValue });
      expect(session).toEqual({ submissionId: SUBMISSION_ID, sessionId: result.sessionId });
    });

    it("returns null after the session expires", async () => {
      const past = Date.now() - 2 * SESSION_TTL_MS;
      const { token } = await issueMagicLink({ submissionId: SUBMISSION_ID, now: past });
      const result = await redeemMagicLink({ token, now: past });
      if (!result.ok) throw new Error("typeguard");
      const session = await getActiveSession({ cookieValue: result.cookieValue });
      expect(session).toBeNull();
    });
  });

  describe("constants", () => {
    it("MAGIC_LINK_TTL_MS is 24h, SESSION_TTL_MS is 7d", () => {
      expect(MAGIC_LINK_TTL_MS).toBe(24 * 60 * 60 * 1000);
      expect(SESSION_TTL_MS).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it("COOKIE_NAME is __Host- prefixed", () => {
      expect(COOKIE_NAME).toBe("__Host-listen_session");
      expect(COOKIE_NAME.startsWith("__Host-")).toBe(true);
    });
  });
});
