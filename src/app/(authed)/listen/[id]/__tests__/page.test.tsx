import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/listenSession", () => ({
  COOKIE_NAME: "__Host-listen_session",
  getActiveSession: vi.fn(),
  writeAudit: vi.fn(),
  AUDIT_EVENT_TYPE: {
    listen_token_id_mismatch: "listen_token_id_mismatch",
    listen_token_redeemed: "listen_token_redeemed",
  },
}));
vi.mock("@/lib/auth/listenToken", () => ({
  verifyListenToken: vi.fn(),
}));
vi.mock("@/lib/booking/submissions", () => ({
  findSubmissionById: vi.fn(),
  SUBMISSION_STATUS: { pending: "pending", paid: "paid", expired: "expired" },
}));
vi.mock("@/lib/sanity/fetch", () => ({
  fetchListenPage: vi.fn(),
}));

const cookiesGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: cookiesGet })),
}));

import { isValidElement, type ReactElement } from "react";

import { getActiveSession, writeAudit } from "@/lib/auth/listenSession";
import { verifyListenToken } from "@/lib/auth/listenToken";
import { findSubmissionById, type SubmissionRecord } from "@/lib/booking/submissions";
import { fetchListenPage } from "@/lib/sanity/fetch";

import type { ListenTokenInterstitialProps } from "../ListenTokenInterstitial";
import type { ListenViewProps } from "../ListenView";

const verifyMock = vi.mocked(verifyListenToken);
const sessionMock = vi.mocked(getActiveSession);
const submissionMock = vi.mocked(findSubmissionById);
const fetchCopyMock = vi.mocked(fetchListenPage);
const auditMock = vi.mocked(writeAudit);

const OWNED: SubmissionRecord = {
  _id: "sub_1",
  status: "paid",
  email: "ada@example.com",
  responses: [],
  createdAt: "2026-04-22T12:00:00Z",
  paidAt: "2026-04-22T12:00:00Z",
  deliveredAt: "2026-04-29T12:00:00Z",
  voiceNoteUrl: "https://cdn.sanity.io/.../voice.m4a",
  pdfUrl: "https://cdn.sanity.io/.../reading.pdf",
  reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$179" },
  amountPaidCents: null,
  amountPaidCurrency: null,
  recipientUserId: "user_1",
};

beforeEach(() => {
  cookiesGet.mockReset();
  verifyMock.mockReset();
  sessionMock.mockReset();
  submissionMock.mockReset();
  fetchCopyMock.mockReset().mockResolvedValue(null);
  auditMock.mockReset();
});

async function renderPage(
  opts: { search?: Record<string, string> } = {},
): Promise<ReactElement> {
  const Page = (await import("../page")).default;
  const element = await Page({
    params: Promise.resolve({ id: "sub_1" }),
    searchParams: Promise.resolve(opts.search ?? {}),
  });
  if (!isValidElement(element)) throw new Error("Page did not return a React element");
  return element as ReactElement;
}

function asInterstitial(element: ReactElement): ListenTokenInterstitialProps {
  return element.props as ListenTokenInterstitialProps;
}

function asListenView(element: ReactElement): ListenViewProps {
  return element.props as ListenViewProps;
}

describe("/listen/[id] one-tap token branch", () => {
  it("ISC-55: valid token + valid recipient renders interstitial with hidden token field", async () => {
    cookiesGet.mockReturnValue(undefined);
    submissionMock.mockResolvedValue(OWNED);
    verifyMock.mockResolvedValue({
      valid: true,
      submissionId: "sub_1",
      jti: "jti-1",
      mintSource: "cron_day7",
      expMs: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });

    const element = await renderPage({ search: { t: "valid.token" } });
    const props = asInterstitial(element);

    expect(props.submissionId).toBe("sub_1");
    expect(props.token).toBe("valid.token");
    expect(props.copy.buttonLabel.length).toBeGreaterThan(0);
  });

  it("ISC-58: expired token falls through to signIn state, no interstitial", async () => {
    cookiesGet.mockReturnValue(undefined);
    submissionMock.mockResolvedValue(OWNED);
    verifyMock.mockResolvedValue({ valid: false, reason: "expired" });

    const element = await renderPage({ search: { t: "expired.token" } });
    const props = asListenView(element);

    expect(props.state.kind).toBe("signIn");
    expect(auditMock).not.toHaveBeenCalled();
  });

  it("ISC-59: tampered token (bad signature) falls through to signIn", async () => {
    cookiesGet.mockReturnValue(undefined);
    submissionMock.mockResolvedValue(OWNED);
    verifyMock.mockResolvedValue({ valid: false, reason: "bad_signature" });

    const element = await renderPage({ search: { t: "tampered.token" } });
    const props = asListenView(element);

    expect(props.state.kind).toBe("signIn");
    expect(auditMock).not.toHaveBeenCalled();
  });

  it("ISC-60: token-id mismatch writes listen_token_id_mismatch audit row, then falls through", async () => {
    cookiesGet.mockReturnValue(undefined);
    submissionMock.mockResolvedValue(OWNED);
    verifyMock.mockResolvedValue({
      valid: true,
      submissionId: "sub_other",
      jti: "jti-1",
      mintSource: "cron_day7",
      expMs: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });

    const element = await renderPage({ search: { t: "mismatch.token" } });
    const props = asListenView(element);

    expect(props.state.kind).toBe("signIn");
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        submissionId: "sub_1",
        eventType: "listen_token_id_mismatch",
        success: false,
      }),
    );
  });

  it("ISC-61: recipient_changed token falls through to signIn, no audit", async () => {
    cookiesGet.mockReturnValue(undefined);
    submissionMock.mockResolvedValue(OWNED);
    verifyMock.mockResolvedValue({ valid: false, reason: "recipient_changed" });

    const element = await renderPage({ search: { t: "stale.token" } });
    const props = asListenView(element);

    expect(props.state.kind).toBe("signIn");
    expect(auditMock).not.toHaveBeenCalled();
  });

  it("submission without recipientUserId: no verify call, falls through to signIn", async () => {
    cookiesGet.mockReturnValue(undefined);
    submissionMock.mockResolvedValue({ ...OWNED, recipientUserId: null });

    const element = await renderPage({ search: { t: "valid.token" } });
    const props = asListenView(element);

    expect(props.state.kind).toBe("signIn");
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it("no `?t=` query: token branch skipped entirely", async () => {
    cookiesGet.mockReturnValue(undefined);
    const element = await renderPage();
    const props = asListenView(element);
    expect(props.state.kind).toBe("signIn");
    expect(verifyMock).not.toHaveBeenCalled();
  });
});
