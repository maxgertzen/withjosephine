import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/listenSession", () => ({
  COOKIE_NAME: "__Host-listen_session",
  getActiveSession: vi.fn(),
}));
vi.mock("@/lib/booking/submissions", () => ({
  listSubmissionsByRecipientUserId: vi.fn(),
  listGiftsByPurchaserUserId: vi.fn(),
}));
vi.mock("@/lib/sanity/fetch", () => ({
  fetchMyReadingsPage: vi.fn(),
  fetchMyGiftsPage: vi.fn(),
}));

const cookiesGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: cookiesGet })),
}));

import { getActiveSession } from "@/lib/auth/listenSession";
import {
  listGiftsByPurchaserUserId,
  listSubmissionsByRecipientUserId,
} from "@/lib/booking/submissions";
import type { SubmissionRecord } from "@/lib/page-previews/types";
import { fetchMyGiftsPage, fetchMyReadingsPage } from "@/lib/sanity/fetch";

import type { LibraryViewProps } from "./_shared/LibraryView";

const sessionMock = vi.mocked(getActiveSession);
const listReadingsMock = vi.mocked(listSubmissionsByRecipientUserId);
const listGiftsMock = vi.mocked(listGiftsByPurchaserUserId);
const fetchReadingsCopyMock = vi.mocked(fetchMyReadingsPage);
const fetchGiftsCopyMock = vi.mocked(fetchMyGiftsPage);

function makeReading(id: string): SubmissionRecord {
  return {
    _id: id,
    status: "paid",
    createdAt: "2026-04-22T12:00:00Z",
    email: "ada@example.com",
    responses: [],
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
    giftClaimSentNowAt: null,
    giftClaimSentNowActor: null,
    giftClaimPriorAlarmAt: null,
  } as SubmissionRecord;
}

beforeEach(() => {
  cookiesGet.mockReset();
  sessionMock.mockReset();
  listReadingsMock.mockReset();
  listGiftsMock.mockReset();
  fetchReadingsCopyMock.mockReset().mockResolvedValue(null);
  fetchGiftsCopyMock.mockReset().mockResolvedValue(null);
});

async function getPageProps(opts: { sent?: boolean } = {}): Promise<LibraryViewProps> {
  const Page = (await import("./page")).default;
  const element = await Page({
    searchParams: Promise.resolve(opts.sent ? { sent: "1" } : {}),
  });
  return (element as { props: LibraryViewProps }).props;
}

describe("/my-readings page (unified library)", () => {
  it("passes signIn state when no cookie present", async () => {
    cookiesGet.mockReturnValue(undefined);
    const props = await getPageProps();
    expect(props.state.kind).toBe("signIn");
    expect(props.defaultTab).toBe("readings");
  });

  it("passes checkEmail state when ?sent=1 and no session", async () => {
    cookiesGet.mockReturnValue(undefined);
    const props = await getPageProps({ sent: true });
    expect(props.state.kind).toBe("checkEmail");
  });

  it("default-tab readings when authenticated session has readings, regardless of gifts", async () => {
    cookiesGet.mockReturnValue({ value: "tok" });
    sessionMock.mockResolvedValue({ userId: "user_1", sessionId: "sess_1", elevatedAt: null });
    listReadingsMock.mockResolvedValue([makeReading("r1")]);
    listGiftsMock.mockResolvedValue([makeReading("g1")]);
    const props = await getPageProps();
    expect(props.state.kind).toBe("list");
    expect(props.defaultTab).toBe("readings");
    if (props.state.kind === "list") {
      expect(props.state.readings).toHaveLength(1);
      expect(props.state.gifts).toHaveLength(1);
    }
  });

  it("default-tab gifts when readings empty but gifts present", async () => {
    cookiesGet.mockReturnValue({ value: "tok" });
    sessionMock.mockResolvedValue({ userId: "user_1", sessionId: "sess_1", elevatedAt: null });
    listReadingsMock.mockResolvedValue([]);
    listGiftsMock.mockResolvedValue([makeReading("g1")]);
    const props = await getPageProps();
    expect(props.defaultTab).toBe("gifts");
  });

  it("default-tab readings when both readings and gifts are empty (warm consumption-first)", async () => {
    cookiesGet.mockReturnValue({ value: "tok" });
    sessionMock.mockResolvedValue({ userId: "user_1", sessionId: "sess_1", elevatedAt: null });
    listReadingsMock.mockResolvedValue([]);
    listGiftsMock.mockResolvedValue([]);
    const props = await getPageProps();
    expect(props.defaultTab).toBe("readings");
    if (props.state.kind === "list") {
      expect(props.state.readings).toHaveLength(0);
      expect(props.state.gifts).toHaveLength(0);
    }
  });

  it("parallel-fetches both submission lists in a single load", async () => {
    cookiesGet.mockReturnValue({ value: "tok" });
    sessionMock.mockResolvedValue({ userId: "user_1", sessionId: "sess_1", elevatedAt: null });
    listReadingsMock.mockResolvedValue([]);
    listGiftsMock.mockResolvedValue([]);
    await getPageProps();
    expect(listReadingsMock).toHaveBeenCalledWith("user_1");
    expect(listGiftsMock).toHaveBeenCalledWith("user_1");
  });

  it("merges Sanity copy over defaults for both readings + gifts singletons", async () => {
    cookiesGet.mockReturnValue(undefined);
    fetchReadingsCopyMock.mockResolvedValue({
      listHeading: "Override readings",
      listSubheading: "Sub",
      openButtonLabel: "Open",
      emptyHeading: "Empty",
      emptyCtaLabel: "Book",
      signInHeading: "Override-signin",
      signInBody: "Body",
      signInButtonLabel: "Send",
      signInFootnote: "Foot",
      checkEmailHeading: "Check",
      checkEmailBody: "Body",
      checkEmailResendLabel: "Again",
      expiredRowLabel: "Rested",
      expiredMailtoLabel: "Email Josephine",
      expiredMailtoSubject: "Fresh link",
    });
    const props = await getPageProps();
    expect(props.readingsCopy.listHeading).toBe("Override readings");
    expect(props.readingsCopy.signInHeading).toBe("Override-signin");
  });
});
