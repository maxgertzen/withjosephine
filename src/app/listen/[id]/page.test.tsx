import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/listenSession", () => ({
  COOKIE_NAME: "__Host-listen_session",
  getActiveSession: vi.fn(),
}));
vi.mock("@/lib/booking/submissions", () => ({
  findSubmissionById: vi.fn(),
}));
vi.mock("@/lib/sanity/fetch", () => ({
  fetchListenPage: vi.fn(),
}));

const cookiesGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: cookiesGet })),
}));

import { getActiveSession } from "@/lib/auth/listenSession";
import { findSubmissionById, type SubmissionRecord } from "@/lib/booking/submissions";
import { fetchListenPage } from "@/lib/sanity/fetch";

import type { ListenViewProps } from "./ListenView";

const sessionMock = vi.mocked(getActiveSession);
const submissionMock = vi.mocked(findSubmissionById);
const fetchCopyMock = vi.mocked(fetchListenPage);

const OWNED_DELIVERED: SubmissionRecord = {
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
  isGift: false,
  purchaserUserId: null,
  recipientEmail: null,
  giftDeliveryMethod: null,
  giftSendAt: null,
  giftMessage: null,
  giftClaimTokenHash: null,
  giftClaimEmailFiredAt: null,
  giftClaimedAt: null,
  giftCancelledAt: null,
};

beforeEach(() => {
  cookiesGet.mockReset();
  sessionMock.mockReset();
  submissionMock.mockReset();
  fetchCopyMock.mockReset().mockResolvedValue(null);
});

async function getPageProps(opts: {
  search?: Record<string, string>;
} = {}): Promise<ListenViewProps> {
  const Page = (await import("./page")).default;
  const element = await Page({
    params: Promise.resolve({ id: "sub_1" }),
    searchParams: Promise.resolve(opts.search ?? {}),
  });
  return (element as { props: ListenViewProps }).props;
}

describe("/listen/[id] page logic", () => {
  it("State 1: renders delivered surface with welcome ribbon when ?welcome=1 and owner session", async () => {
    cookiesGet.mockReturnValue({ value: "tok" });
    sessionMock.mockResolvedValue({ userId: "user_1", sessionId: "sess_1" });
    submissionMock.mockResolvedValue(OWNED_DELIVERED);

    const props = await getPageProps({ search: { welcome: "1" } });

    expect(props.state.kind).toBe("delivered");
    if (props.state.kind !== "delivered") throw new Error("type narrowing");
    expect(props.state.readingName).toBe("Soul Blueprint");
    expect(props.state.voiceNoteAudioPath).toBe("/api/listen/sub_1/audio");
    expect(props.state.pdfDownloadPath).toBe("/api/listen/sub_1/pdf");
    expect(props.state.showWelcomeRibbon).toBe(true);
  });

  it("State 2: renders delivered surface WITHOUT ribbon on plain return visit", async () => {
    cookiesGet.mockReturnValue({ value: "tok" });
    sessionMock.mockResolvedValue({ userId: "user_1", sessionId: "sess_1" });
    submissionMock.mockResolvedValue(OWNED_DELIVERED);

    const props = await getPageProps();

    expect(props.state.kind).toBe("delivered");
    if (props.state.kind !== "delivered") throw new Error("type narrowing");
    expect(props.state.showWelcomeRibbon).toBe(false);
  });

  it("State 3: renders sign-in card when no cookie present", async () => {
    cookiesGet.mockReturnValue(undefined);
    const props = await getPageProps();
    expect(props.state.kind).toBe("signIn");
    expect(submissionMock).not.toHaveBeenCalled();
  });

  it("State 3 (privacy): renders sign-in card when cookie maps to a DIFFERENT user", async () => {
    cookiesGet.mockReturnValue({ value: "tok" });
    sessionMock.mockResolvedValue({ userId: "user_other", sessionId: "sess_x" });
    submissionMock.mockResolvedValue(OWNED_DELIVERED);

    const props = await getPageProps();
    expect(props.state.kind).toBe("signIn");
  });

  it("State 3 (privacy): renders sign-in card when submission doesn't exist", async () => {
    cookiesGet.mockReturnValue({ value: "tok" });
    sessionMock.mockResolvedValue({ userId: "user_1", sessionId: "sess_1" });
    submissionMock.mockResolvedValue(null);
    const props = await getPageProps();
    expect(props.state.kind).toBe("signIn");
  });

  it("State 4: renders check-email card when ?sent=1 (even without session)", async () => {
    cookiesGet.mockReturnValue(undefined);
    const props = await getPageProps({ search: { sent: "1" } });
    expect(props.state.kind).toBe("checkEmail");
  });

  it("State 5a: renders rested-link card when ?error=rested", async () => {
    cookiesGet.mockReturnValue(undefined);
    const props = await getPageProps({ search: { error: "rested" } });
    expect(props.state.kind).toBe("rested");
  });

  it("State 5c: renders throttled card when ?error=throttled", async () => {
    cookiesGet.mockReturnValue(undefined);
    const props = await getPageProps({ search: { error: "throttled" } });
    expect(props.state.kind).toBe("throttled");
  });

  it("State 5d: renders asset-trouble card when owner session but submission has no assets yet", async () => {
    cookiesGet.mockReturnValue({ value: "tok" });
    sessionMock.mockResolvedValue({ userId: "user_1", sessionId: "sess_1" });
    submissionMock.mockResolvedValue({
      ...OWNED_DELIVERED,
      voiceNoteUrl: undefined,
      pdfUrl: undefined,
    });
    const props = await getPageProps();
    expect(props.state.kind).toBe("assetTrouble");
  });

  it("State 5d: renders asset-trouble when owner session but submission not yet delivered", async () => {
    cookiesGet.mockReturnValue({ value: "tok" });
    sessionMock.mockResolvedValue({ userId: "user_1", sessionId: "sess_1" });
    submissionMock.mockResolvedValue({ ...OWNED_DELIVERED, deliveredAt: undefined });
    const props = await getPageProps();
    expect(props.state.kind).toBe("assetTrouble");
  });

  it("delivered with voice note only (no PDF) renders audio path; pdf path is null", async () => {
    cookiesGet.mockReturnValue({ value: "tok" });
    sessionMock.mockResolvedValue({ userId: "user_1", sessionId: "sess_1" });
    submissionMock.mockResolvedValue({ ...OWNED_DELIVERED, pdfUrl: undefined });
    const props = await getPageProps();
    expect(props.state.kind).toBe("delivered");
    if (props.state.kind !== "delivered") throw new Error("type narrowing");
    expect(props.state.voiceNoteAudioPath).toBe("/api/listen/sub_1/audio");
    expect(props.state.pdfDownloadPath).toBeNull();
  });

  it("merges Sanity copy over defaults when present", async () => {
    cookiesGet.mockReturnValue(undefined);
    fetchCopyMock.mockResolvedValue({
      welcomeRibbon: "Override ribbon",
      deliveredHeading: "Override heading",
      deliveredSubheading: "Override sub",
      voiceNoteLabel: "VN",
      pdfLabel: "PDF",
      pdfButtonLabel: "Download",
      closerLine1: "Override closer",
      closerLine2: "Override sign-off",
      signInHeading: "Override sign-in",
      signInBody: "Body",
      signInButtonLabel: "Send",
      signInFootnote: "Foot",
      checkEmailHeading: "Check",
      checkEmailBody: "Body",
      checkEmailResendLabel: "Again",
      restedHeading: "Rested",
      restedBody: "Body",
      restedCtaLabel: "Fresh",
      throttledHeading: "Throttled",
      throttledBody: "Body",
      throttledMailtoLabel: "Write",
      throttledMailtoSubject: "Subject",
      assetTroubleHeading: "Trouble",
      assetTroubleBody: "Body",
      assetTroubleTryAgainLabel: "Retry",
      assetTroubleMailtoLabel: "Write",
      assetTroubleMailtoSubject: "Subject",
    });
    const props = await getPageProps();
    expect(props.copy.signInHeading).toBe("Override sign-in");
    expect(props.copy.welcomeRibbon).toBe("Override ribbon");
  });
});
