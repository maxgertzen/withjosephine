import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/listenSession", () => ({
  AUDIT_EVENT_TYPE: {
    recipient_sessions_revoked: "recipient_sessions_revoked",
    recipient_sessions_revoke_invalid: "recipient_sessions_revoke_invalid",
  },
  writeAudit: vi.fn(),
}));
vi.mock("@/lib/auth/newDeviceNotice", () => ({
  verifyNewDeviceRevokeToken: vi.fn(),
  revokeAllSessionsForUser: vi.fn(),
}));
vi.mock("@/lib/auth/requestAudit", () => ({
  getRequestAuditContext: vi
    .fn()
    .mockResolvedValue({ ipHash: "ip-h", userAgentHash: "ua-h" }),
}));
vi.mock("@/lib/booking/submissions", () => ({
  findSubmissionById: vi.fn(),
}));
vi.mock("@/lib/resend", () => ({
  sendNewDeviceRevokeAdminAlert: vi.fn().mockResolvedValue({ kind: "dry_run" }),
}));

import { writeAudit } from "@/lib/auth/listenSession";
import {
  revokeAllSessionsForUser,
  verifyNewDeviceRevokeToken,
} from "@/lib/auth/newDeviceNotice";
import { findSubmissionById } from "@/lib/booking/submissions";
import { sendNewDeviceRevokeAdminAlert } from "@/lib/resend";

const verifyMock = vi.mocked(verifyNewDeviceRevokeToken);
const revokeMock = vi.mocked(revokeAllSessionsForUser);
const findSubmissionMock = vi.mocked(findSubmissionById);
const auditMock = vi.mocked(writeAudit);
const adminAlertMock = vi.mocked(sendNewDeviceRevokeAdminAlert);

beforeEach(() => {
  verifyMock.mockReset();
  revokeMock.mockReset();
  findSubmissionMock.mockReset();
  auditMock.mockReset();
  adminAlertMock.mockReset();
  adminAlertMock.mockResolvedValue({ kind: "dry_run" });
});

async function invokeGet(url: string): Promise<Response> {
  const { GET } = await import("./route");
  return GET(new Request(url, { method: "GET" }));
}

describe("GET /api/auth/revoke-recipient-sessions", () => {
  it("with valid token: revokes sessions, audits, fires admin alert, redirects to /auth/revoked", async () => {
    verifyMock.mockResolvedValue({
      valid: true,
      recipientUserId: "user-target",
      submissionId: "sub-target",
      expMs: Date.now() + 60_000,
    });
    findSubmissionMock.mockResolvedValue({
      _id: "sub-target",
      recipientUserId: "user-target",
    } as never);
    revokeMock.mockResolvedValue({ revokedCount: 3 });

    const response = await invokeGet(
      "https://withjosephine.com/api/auth/revoke-recipient-sessions?t=good.token",
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://withjosephine.com/auth/revoked",
    );
    expect(revokeMock).toHaveBeenCalledWith({ userId: "user-target" });
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-target",
        submissionId: "sub-target",
        eventType: "recipient_sessions_revoked",
        success: true,
      }),
    );
    expect(adminAlertMock).toHaveBeenCalledWith({
      submissionId: "sub-target",
      revokedCount: 3,
    });
  });

  it("with missing token: 303 to error page, audits invalid, no revoke", async () => {
    const response = await invokeGet(
      "https://withjosephine.com/api/auth/revoke-recipient-sessions",
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://withjosephine.com/auth/revoked-error",
    );
    expect(revokeMock).not.toHaveBeenCalled();
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
        eventType: "recipient_sessions_revoke_invalid",
        success: false,
      }),
    );
  });

  it("with bad signature: 303 to error page, no revoke, audits with null userId", async () => {
    verifyMock.mockResolvedValue({ valid: false, reason: "bad_signature" });

    const response = await invokeGet(
      "https://withjosephine.com/api/auth/revoke-recipient-sessions?t=tampered",
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://withjosephine.com/auth/revoked-error",
    );
    expect(revokeMock).not.toHaveBeenCalled();
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
        eventType: "recipient_sessions_revoke_invalid",
        success: false,
      }),
    );
  });

  it("with expired token: 303 to error page", async () => {
    verifyMock.mockResolvedValue({ valid: false, reason: "expired" });

    const response = await invokeGet(
      "https://withjosephine.com/api/auth/revoke-recipient-sessions?t=expired",
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://withjosephine.com/auth/revoked-error",
    );
    expect(revokeMock).not.toHaveBeenCalled();
  });

  it("with valid token but submission/userId mismatch: 303 to error, no revoke", async () => {
    verifyMock.mockResolvedValue({
      valid: true,
      recipientUserId: "user-token",
      submissionId: "sub-token",
      expMs: Date.now() + 60_000,
    });
    findSubmissionMock.mockResolvedValue({
      _id: "sub-token",
      recipientUserId: "user-DIFFERENT",
    } as never);

    const response = await invokeGet(
      "https://withjosephine.com/api/auth/revoke-recipient-sessions?t=stale.recipient",
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://withjosephine.com/auth/revoked-error",
    );
    expect(revokeMock).not.toHaveBeenCalled();
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-token",
        submissionId: "sub-token",
        eventType: "recipient_sessions_revoke_invalid",
        success: false,
      }),
    );
  });
});
