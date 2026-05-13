import { beforeAll, describe, expect, it } from "vitest";

import { dbExec, dbQuery } from "@/lib/booking/persistence/sqlClient";

import {
  COOKIE_NAME,
  getActiveSession,
  hashIp,
  hashUserAgent,
  issueMagicLink,
  MAGIC_LINK_TTL_MS,
  MISMATCH_LIMIT,
  redeemMagicLink,
  requireListenSession,
  revokeSession,
  SESSION_TTL_MS,
} from "./listenSession";
import { getOrCreateUser } from "./users";

const SECRET = "test-secret-32-bytes-of-hex-here";

async function seedUser(email = "alice@example.com"): Promise<string> {
  const { userId } = await getOrCreateUser({ email });
  return userId;
}

async function seedSubmissionForUser(
  submissionId: string,
  userId: string,
  email = "alice@example.com",
): Promise<void> {
  await dbExec(
    `INSERT INTO submissions
       (id, email, status, reading_slug, responses_json, created_at, recipient_user_id)
     VALUES (?, ?, 'paid', 'soul-blueprint', '[]', ?, ?)`,
    [submissionId, email, new Date().toISOString(), userId],
  );
}

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
      const userId = await seedUser();
      const { token } = await issueMagicLink({ userId });
      expect(token).toMatch(/^[0-9a-f]{64}$/); // 32 bytes hex
      const rows = await dbQuery<{ token_hash: string }>(
        `SELECT token_hash FROM listen_magic_link WHERE user_id = ?`,
        [userId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]!.token_hash).not.toBe(token); // raw token never persisted
      expect(rows[0]!.token_hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("sets expiry exactly MAGIC_LINK_TTL_MS in the future", async () => {
      const userId = await seedUser();
      const now = 1_700_000_000_000;
      const { expiresAt } = await issueMagicLink({ userId, now });
      expect(expiresAt).toBe(now + MAGIC_LINK_TTL_MS);
    });

    it("writes a link_issued audit row tagged success=1", async () => {
      const userId = await seedUser();
      await issueMagicLink({ userId });
      const rows = await dbQuery<{ event_type: string; success: number }>(
        `SELECT event_type, success FROM listen_audit WHERE user_id = ?`,
        [userId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({ event_type: "link_issued", success: 1 });
    });
  });

  describe("redeemMagicLink", () => {
    it("returns ok + userId + cookie value when claimedEmail matches the user's email", async () => {
      const userId = await seedUser("alice@example.com");
      const { token } = await issueMagicLink({ userId });
      const result = await redeemMagicLink({ token, claimedEmail: "alice@example.com" });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("typeguard");
      expect(result.userId).toBe(userId);
      expect(result.cookieValue).toMatch(/^[0-9a-f]{64}$/);
      expect(result.sessionId).toMatch(/^[0-9a-f-]{36}$/); // UUID
    });

    it("rejects a second redeem of the same token (single-use)", async () => {
      const userId = await seedUser();
      const { token } = await issueMagicLink({ userId });
      await redeemMagicLink({ token, claimedEmail: "alice@example.com" });
      const second = await redeemMagicLink({ token, claimedEmail: "alice@example.com" });
      expect(second).toEqual({ ok: false, reason: "already_consumed" });
    });

    it("rejects an expired magic link", async () => {
      const userId = await seedUser();
      const past = Date.now() - 2 * MAGIC_LINK_TTL_MS;
      const { token } = await issueMagicLink({ userId, now: past });
      const result = await redeemMagicLink({ token, claimedEmail: "alice@example.com" });
      expect(result).toEqual({ ok: false, reason: "expired" });
    });

    it("rejects an invalid token (no DB row)", async () => {
      const result = await redeemMagicLink({
        token: "deadbeef".repeat(8),
        claimedEmail: "alice@example.com",
      });
      expect(result).toEqual({ ok: false, reason: "invalid" });
    });

    it("creates a session row tied to the userId", async () => {
      const userId = await seedUser();
      const { token } = await issueMagicLink({ userId });
      const result = await redeemMagicLink({ token, claimedEmail: "alice@example.com" });
      if (!result.ok) throw new Error("typeguard");
      const rows = await dbQuery<{ user_id: string; revoked_at: number | null }>(
        `SELECT user_id, revoked_at FROM listen_session WHERE id = ?`,
        [result.sessionId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({ user_id: userId, revoked_at: null });
    });
  });

  describe("email-match (Level 1 hardening)", () => {
    it("rejects when claimedEmail does not match the user's email", async () => {
      const userId = await seedUser("alice@example.com");
      const { token } = await issueMagicLink({ userId });
      const result = await redeemMagicLink({ token, claimedEmail: "bob@example.com" });
      expect(result).toEqual({ ok: false, reason: "email_mismatch" });
    });

    it("matches case-insensitively and with surrounding whitespace", async () => {
      const userId = await seedUser("alice@example.com");
      const { token } = await issueMagicLink({ userId });
      const result = await redeemMagicLink({
        token,
        claimedEmail: "  Alice@Example.COM ",
      });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("typeguard");
      expect(result.userId).toBe(userId);
    });

    it("does not consume the magic link on email_mismatch (still single-use available)", async () => {
      const userId = await seedUser("alice@example.com");
      const { token } = await issueMagicLink({ userId });
      await redeemMagicLink({ token, claimedEmail: "wrong@example.com" });
      const retry = await redeemMagicLink({ token, claimedEmail: "alice@example.com" });
      expect(retry.ok).toBe(true);
    });

    it("writes a link_email_mismatch audit row on failed match — user_id is NULL (no victim attribution)", async () => {
      const userId = await seedUser("alice@example.com");
      const { token } = await issueMagicLink({ userId });
      await redeemMagicLink({ token, claimedEmail: "bob@example.com" });
      // Anti-attribution-misdirection: brute-force on Alice's link MUST NOT
      // fill the audit table with `(user_id=alice, link_email_mismatch)`
      // rows that look like Alice fat-fingering her own email.
      const rows = await dbQuery<{ event_type: string; success: number; user_id: string | null }>(
        `SELECT event_type, success, user_id FROM listen_audit WHERE event_type = 'link_email_mismatch'`,
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({ event_type: "link_email_mismatch", success: 0, user_id: null });
    });

    it("forwarded-link Level 1 success path: alice issues, alice claims, alice's session granted", async () => {
      // Documents the spec's accepted limitation: if the attacker correctly
      // types the victim's email (e.g. learned from a screenshot), they
      // succeed. This test pins the success path so a future regression
      // changing semantics gets caught.
      const aliceId = await seedUser("alice@example.com");
      const { token } = await issueMagicLink({ userId: aliceId });
      const result = await redeemMagicLink({ token, claimedEmail: "alice@example.com" });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("typeguard");
      expect(result.userId).toBe(aliceId);
    });

    it(`mismatch counter — ${MISMATCH_LIMIT - 1} mismatches still allowed; correct email succeeds`, async () => {
      const userId = await seedUser("alice@example.com");
      const { token } = await issueMagicLink({ userId });
      for (let i = 0; i < MISMATCH_LIMIT - 1; i++) {
        await redeemMagicLink({ token, claimedEmail: `wrong${i}@example.com` });
      }
      const success = await redeemMagicLink({ token, claimedEmail: "alice@example.com" });
      expect(success.ok).toBe(true);
    });

    it(`mismatch counter — ${MISMATCH_LIMIT}th mismatch poisons the link (correct email returns already_consumed)`, async () => {
      const userId = await seedUser("alice@example.com");
      const { token } = await issueMagicLink({ userId });
      for (let i = 0; i < MISMATCH_LIMIT; i++) {
        await redeemMagicLink({ token, claimedEmail: `wrong${i}@example.com` });
      }
      const after = await redeemMagicLink({ token, claimedEmail: "alice@example.com" });
      expect(after).toEqual({ ok: false, reason: "already_consumed" });
    });

    it("writes a link_mismatch_poisoned audit row at the cap (attributed to the link's user_id)", async () => {
      const userId = await seedUser("alice@example.com");
      const { token } = await issueMagicLink({ userId });
      for (let i = 0; i < MISMATCH_LIMIT; i++) {
        await redeemMagicLink({ token, claimedEmail: `wrong${i}@example.com` });
      }
      const poisoned = await dbQuery<{ event_type: string; user_id: string | null }>(
        `SELECT event_type, user_id FROM listen_audit WHERE event_type = 'link_mismatch_poisoned'`,
      );
      expect(poisoned).toHaveLength(1);
      expect(poisoned[0]?.user_id).toBe(userId);
    });
  });

  describe("UA-hash audit consistency across redeem-failure branches", () => {
    const ua = "Mozilla/5.0 test-agent";
    let uaHash = "";
    beforeAll(async () => {
      uaHash = await hashUserAgent(ua);
    });

    it("link_invalid carries user_agent_hash when caller supplies it", async () => {
      await redeemMagicLink({
        token: "deadbeef".repeat(8),
        claimedEmail: "alice@example.com",
        userAgentHash: uaHash,
      });
      const rows = await dbQuery<{ user_agent_hash: string | null }>(
        `SELECT user_agent_hash FROM listen_audit WHERE event_type = 'link_invalid'`,
      );
      expect(rows[0]?.user_agent_hash).toBe(uaHash);
    });

    it("link_already_consumed carries user_agent_hash on retry", async () => {
      const userId = await seedUser();
      const { token } = await issueMagicLink({ userId });
      await redeemMagicLink({ token, claimedEmail: "alice@example.com", userAgentHash: uaHash });
      await redeemMagicLink({ token, claimedEmail: "alice@example.com", userAgentHash: uaHash });
      const rows = await dbQuery<{ user_agent_hash: string | null }>(
        `SELECT user_agent_hash FROM listen_audit WHERE event_type = 'link_already_consumed'`,
      );
      expect(rows[0]?.user_agent_hash).toBe(uaHash);
    });

    it("link_expired carries user_agent_hash", async () => {
      const userId = await seedUser();
      const past = Date.now() - 2 * MAGIC_LINK_TTL_MS;
      const { token } = await issueMagicLink({ userId, now: past });
      await redeemMagicLink({ token, claimedEmail: "alice@example.com", userAgentHash: uaHash });
      const rows = await dbQuery<{ user_agent_hash: string | null }>(
        `SELECT user_agent_hash FROM listen_audit WHERE event_type = 'link_expired'`,
      );
      expect(rows[0]?.user_agent_hash).toBe(uaHash);
    });

    it("link_email_mismatch carries user_agent_hash", async () => {
      const userId = await seedUser("alice@example.com");
      const { token } = await issueMagicLink({ userId });
      await redeemMagicLink({ token, claimedEmail: "wrong@example.com", userAgentHash: uaHash });
      const rows = await dbQuery<{ user_agent_hash: string | null }>(
        `SELECT user_agent_hash FROM listen_audit WHERE event_type = 'link_email_mismatch'`,
      );
      expect(rows[0]?.user_agent_hash).toBe(uaHash);
    });
  });

  describe("expires_at boundary (off-by-one fix)", () => {
    it("treats expires_at == now as still-alive (boundary inclusive)", async () => {
      const userId = await seedUser();
      const issuedAt = Date.UTC(2026, 4, 10, 0, 0, 0);
      const { token, expiresAt } = await issueMagicLink({ userId, now: issuedAt });
      // Redeem at exactly the expiry instant — must succeed (off-by-one fix).
      const result = await redeemMagicLink({
        token,
        claimedEmail: "alice@example.com",
        now: expiresAt,
      });
      expect(result.ok).toBe(true);
    });

    it("rejects 1 ms past expires_at as expired", async () => {
      const userId = await seedUser();
      const issuedAt = Date.UTC(2026, 4, 10, 0, 0, 0);
      const { token, expiresAt } = await issueMagicLink({ userId, now: issuedAt });
      const result = await redeemMagicLink({
        token,
        claimedEmail: "alice@example.com",
        now: expiresAt + 1,
      });
      expect(result).toEqual({ ok: false, reason: "expired" });
    });
  });

  describe("atomic single-use (concurrent redeem race)", () => {
    it("two simultaneous redeems produce exactly ONE session — second loses to already_consumed", async () => {
      const userId = await seedUser("alice@example.com");
      const { token } = await issueMagicLink({ userId });

      const [first, second] = await Promise.all([
        redeemMagicLink({ token, claimedEmail: "alice@example.com" }),
        redeemMagicLink({ token, claimedEmail: "alice@example.com" }),
      ]);

      const wins = [first, second].filter((r) => r.ok);
      const losses = [first, second].filter((r) => !r.ok);
      expect(wins).toHaveLength(1);
      expect(losses).toHaveLength(1);
      expect(losses[0]).toEqual({ ok: false, reason: "already_consumed" });

      const sessionRows = await dbQuery<{ id: string }>(
        `SELECT id FROM listen_session WHERE user_id = ?`,
        [userId],
      );
      expect(sessionRows).toHaveLength(1);
    });
  });

  describe("requireListenSession", () => {
    it("returns true for a session whose user matches the submission's recipient_user_id", async () => {
      const userId = await seedUser();
      await seedSubmissionForUser("sub_1", userId);
      const { token } = await issueMagicLink({ userId });
      const result = await redeemMagicLink({ token, claimedEmail: "alice@example.com" });
      if (!result.ok) throw new Error("typeguard");
      const ok = await requireListenSession({
        cookieValue: result.cookieValue,
        submissionId: "sub_1",
      });
      expect(ok).toBe(true);
    });

    it("returns false for cross-user denial — Bob's session can't read Alice's submission", async () => {
      const aliceId = await seedUser("alice@example.com");
      const bobId = await seedUser("bob@example.com");
      await seedSubmissionForUser("sub_alice", aliceId, "alice@example.com");
      await seedSubmissionForUser("sub_bob", bobId, "bob@example.com");
      const { token } = await issueMagicLink({ userId: bobId });
      const result = await redeemMagicLink({ token, claimedEmail: "bob@example.com" });
      if (!result.ok) throw new Error("typeguard");
      const ok = await requireListenSession({
        cookieValue: result.cookieValue,
        submissionId: "sub_alice",
      });
      expect(ok).toBe(false);
    });

    it("returns false when cookie is empty", async () => {
      const userId = await seedUser();
      await seedSubmissionForUser("sub_1", userId);
      const ok = await requireListenSession({ cookieValue: "", submissionId: "sub_1" });
      expect(ok).toBe(false);
    });

    it("returns false when cookie does not map to any session", async () => {
      const userId = await seedUser();
      await seedSubmissionForUser("sub_1", userId);
      const ok = await requireListenSession({
        cookieValue: "f".repeat(64),
        submissionId: "sub_1",
      });
      expect(ok).toBe(false);
    });

    it("returns false for an expired session", async () => {
      const userId = await seedUser();
      await seedSubmissionForUser("sub_1", userId);
      const past = Date.now() - 2 * SESSION_TTL_MS;
      const { token } = await issueMagicLink({ userId, now: past });
      const result = await redeemMagicLink({
        token,
        claimedEmail: "alice@example.com",
        now: past,
      });
      if (!result.ok) throw new Error("typeguard");
      const ok = await requireListenSession({
        cookieValue: result.cookieValue,
        submissionId: "sub_1",
      });
      expect(ok).toBe(false);
    });

    it("returns false after the session is explicitly revoked", async () => {
      const userId = await seedUser();
      await seedSubmissionForUser("sub_1", userId);
      const { token } = await issueMagicLink({ userId });
      const result = await redeemMagicLink({ token, claimedEmail: "alice@example.com" });
      if (!result.ok) throw new Error("typeguard");
      await revokeSession({ sessionId: result.sessionId });
      const ok = await requireListenSession({
        cookieValue: result.cookieValue,
        submissionId: "sub_1",
      });
      expect(ok).toBe(false);
    });

    it("returns false when the submission has no recipient_user_id (legacy/pre-paid)", async () => {
      const userId = await seedUser();
      await dbExec(
        `INSERT INTO submissions
           (id, email, status, reading_slug, responses_json, created_at, recipient_user_id)
         VALUES (?, ?, 'pending', 'soul-blueprint', '[]', ?, NULL)`,
        ["sub_orphan", "alice@example.com", new Date().toISOString()],
      );
      const { token } = await issueMagicLink({ userId });
      const result = await redeemMagicLink({ token, claimedEmail: "alice@example.com" });
      if (!result.ok) throw new Error("typeguard");
      const ok = await requireListenSession({
        cookieValue: result.cookieValue,
        submissionId: "sub_orphan",
      });
      expect(ok).toBe(false);
    });

    it("returns false when the submission does not exist", async () => {
      const userId = await seedUser();
      const { token } = await issueMagicLink({ userId });
      const result = await redeemMagicLink({ token, claimedEmail: "alice@example.com" });
      if (!result.ok) throw new Error("typeguard");
      const ok = await requireListenSession({
        cookieValue: result.cookieValue,
        submissionId: "sub_does_not_exist",
      });
      expect(ok).toBe(false);
    });

    it("emits listen_cross_user_denied audit row on cross-user probe", async () => {
      const aliceId = await seedUser("alice@example.com");
      const bobId = await seedUser("bob@example.com");
      await seedSubmissionForUser("sub_alice", aliceId, "alice@example.com");
      await seedSubmissionForUser("sub_bob", bobId, "bob@example.com");
      const { token } = await issueMagicLink({ userId: bobId });
      const result = await redeemMagicLink({ token, claimedEmail: "bob@example.com" });
      if (!result.ok) throw new Error("typeguard");
      await requireListenSession({
        cookieValue: result.cookieValue,
        submissionId: "sub_alice",
        ipHash: "ip_hash_test",
        userAgentHash: "ua_hash_test",
      });
      const audit = await dbQuery<{
        event_type: string;
        user_id: string | null;
        submission_id: string | null;
        ip_hash: string | null;
        user_agent_hash: string | null;
      }>(
        `SELECT event_type, user_id, submission_id, ip_hash, user_agent_hash
           FROM listen_audit WHERE event_type = 'listen_cross_user_denied'`,
      );
      expect(audit).toHaveLength(1);
      expect(audit[0]).toEqual({
        event_type: "listen_cross_user_denied",
        user_id: bobId,
        submission_id: "sub_alice",
        ip_hash: "ip_hash_test",
        user_agent_hash: "ua_hash_test",
      });
    });

    it("emits listen_session_invalid audit row when cookie is empty/expired/missing", async () => {
      const userId = await seedUser();
      await seedSubmissionForUser("sub_1", userId);
      await requireListenSession({
        cookieValue: "f".repeat(64),
        submissionId: "sub_1",
        ipHash: "ip_hash_test",
      });
      const audit = await dbQuery<{ event_type: string; submission_id: string | null }>(
        `SELECT event_type, submission_id FROM listen_audit WHERE event_type = 'listen_session_invalid'`,
      );
      expect(audit).toHaveLength(1);
      expect(audit[0]).toEqual({
        event_type: "listen_session_invalid",
        submission_id: "sub_1",
      });
    });

    it("emits listen_session_invalid for orphan/missing submission (no recipient_user_id)", async () => {
      const userId = await seedUser();
      await dbExec(
        `INSERT INTO submissions
           (id, email, status, reading_slug, responses_json, created_at, recipient_user_id)
         VALUES (?, ?, 'pending', 'soul-blueprint', '[]', ?, NULL)`,
        ["sub_orphan", "alice@example.com", new Date().toISOString()],
      );
      const { token } = await issueMagicLink({ userId });
      const result = await redeemMagicLink({ token, claimedEmail: "alice@example.com" });
      if (!result.ok) throw new Error("typeguard");
      await requireListenSession({
        cookieValue: result.cookieValue,
        submissionId: "sub_orphan",
      });
      const audit = await dbQuery<{ event_type: string; user_id: string | null }>(
        `SELECT event_type, user_id FROM listen_audit
           WHERE event_type = 'listen_session_invalid' AND submission_id = 'sub_orphan'`,
      );
      expect(audit).toHaveLength(1);
      expect(audit[0]?.user_id).toBe(userId);
    });
  });

  describe("revokeSession", () => {
    it("writes a listen_session_revoked audit row", async () => {
      const userId = await seedUser();
      const { token } = await issueMagicLink({ userId });
      const result = await redeemMagicLink({ token, claimedEmail: "alice@example.com" });
      if (!result.ok) throw new Error("typeguard");
      await revokeSession({ sessionId: result.sessionId, userId, ipHash: "ip_hash_test" });
      const audit = await dbQuery<{ event_type: string; user_id: string | null }>(
        `SELECT event_type, user_id FROM listen_audit WHERE event_type = 'listen_session_revoked'`,
      );
      expect(audit).toHaveLength(1);
      expect(audit[0]?.user_id).toBe(userId);
    });
  });

  describe("getActiveSession", () => {
    it("returns userId + sessionId for a live cookie", async () => {
      const userId = await seedUser();
      const { token } = await issueMagicLink({ userId });
      const result = await redeemMagicLink({ token, claimedEmail: "alice@example.com" });
      if (!result.ok) throw new Error("typeguard");
      const session = await getActiveSession({ cookieValue: result.cookieValue });
      expect(session).toEqual({ userId, sessionId: result.sessionId });
    });

    it("returns null after the session expires", async () => {
      const userId = await seedUser();
      const past = Date.now() - 2 * SESSION_TTL_MS;
      const { token } = await issueMagicLink({ userId, now: past });
      const result = await redeemMagicLink({
        token,
        claimedEmail: "alice@example.com",
        now: past,
      });
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
